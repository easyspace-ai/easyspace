package websocket

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"go.uber.org/zap"

	appErrors "github.com/easyspace-ai/luckdb/server/pkg/errors"
	"github.com/easyspace-ai/luckdb/server/pkg/response"
)

const (
	// 写等待时间
	writeWait = 10 * time.Second
	// 读取下一个pong消息的等待时间
	pongWait = 60 * time.Second
	// 发送ping消息的间隔时间
	pingPeriod = (pongWait * 9) / 10
	// 最大消息大小
	maxMessageSize = 512
)

// Handler WebSocket处理器
type Handler struct {
	manager  *Manager
	logger   *zap.Logger
	upgrader websocket.Upgrader
}

// NewHandler 创建新的WebSocket处理器
func NewHandler(manager *Manager, logger *zap.Logger) *Handler {
	return &Handler{
		manager: manager,
		logger:  logger,
		upgrader: websocket.Upgrader{
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
			CheckOrigin: func(r *http.Request) bool {
				// 在生产环境中应该检查Origin
				return true
			},
		},
	}
}

// HandleWebSocket 处理WebSocket连接
func (h *Handler) HandleWebSocket(c *gin.Context) {
	// ✅ 优先从 gin context 获取用户信息（由 auth middleware 设置）
	userID := ""
	if uid, exists := c.Get("user_id"); exists {
		if uidStr, ok := uid.(string); ok {
			userID = uidStr
		}
	}

	// 如果 context 中没有，尝试从查询参数或头部获取
	if userID == "" {
		userID = c.Query("user_id")
	}
	if userID == "" {
		userID = c.GetHeader("X-User-ID")
	}

	if userID == "" {
		h.logger.Error("WebSocket connection rejected: missing user_id")
		response.Error(c, appErrors.ErrBadRequest.WithDetails("missing user_id"))
		return
	}

	h.logger.Info("WebSocket connection accepted",
		zap.String("user_id", userID))

	// 升级HTTP连接为WebSocket
	conn, err := h.upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		h.logger.Error("Failed to upgrade connection to WebSocket", zap.Error(err))
		return
	}

	// 创建连接对象
	connection := &Connection{
		ID:            generateConnectionID(),
		UserID:        userID,
		SessionID:     c.Query("session_id"),
		Conn:          conn,
		Send:          make(chan *Message, 256),
		Manager:       h.manager,
		Subscriptions: make(map[string]bool),
		LastPing:      time.Now(),
	}

	// 注册连接
	h.manager.register <- connection

	// 启动读写协程
	go h.writePump(connection)
	go h.readPump(connection)

	h.logger.Info("WebSocket connection established",
		zap.String("connection_id", connection.ID),
		zap.String("user_id", userID),
		zap.String("session_id", connection.SessionID),
	)
}

// readPump 读取消息
func (h *Handler) readPump(conn *Connection) {
	defer func() {
		h.manager.unregister <- conn
		conn.Conn.Close()
	}()

	conn.Conn.SetReadLimit(maxMessageSize)
	conn.Conn.SetReadDeadline(time.Now().Add(pongWait))
	conn.Conn.SetPongHandler(func(string) error {
		conn.mu.Lock()
		conn.LastPing = time.Now()
		conn.mu.Unlock()
		conn.Conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, messageData, err := conn.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				h.logger.Error("WebSocket read error", zap.Error(err))
			}
			break
		}

		// 解析消息
		var msg Message
		if err := json.Unmarshal(messageData, &msg); err != nil {
			h.logger.Error("Failed to parse WebSocket message", zap.Error(err))
			continue
		}

		// 处理消息
		h.handleMessage(conn, &msg)
	}
}

// writePump 写入消息
func (h *Handler) writePump(conn *Connection) {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		conn.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-conn.Send:
			conn.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				conn.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			// 确保消息是结构体而不是字符串
			if message == nil {
				continue
			}

			// 验证消息格式
			if err := message.Validate(); err != nil {
				h.logger.Error("Invalid message format", zap.Error(err))
				continue
			}

			// 使用 ToJSON 方法确保正确的序列化
			messageBytes, err := message.ToJSON()
			if err != nil {
				h.logger.Error("Failed to serialize WebSocket message", zap.Error(err))
				continue
			}

			// 发送 JSON 字节
			if err := conn.Conn.WriteMessage(websocket.TextMessage, messageBytes); err != nil {
				h.logger.Error("Failed to write WebSocket message", zap.Error(err))
				return
			}

		case <-ticker.C:
			conn.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := conn.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// handleMessage 处理消息
func (h *Handler) handleMessage(conn *Connection, msg *Message) {
	switch msg.Type {
	case MessageTypePing:
		h.handlePing(conn, msg)
	case MessageTypeSubscribe:
		h.handleSubscribe(conn, msg)
	case MessageTypeUnsubscribe:
		h.handleUnsubscribe(conn, msg)
	case MessageTypeQuery:
		h.handleQuery(conn, msg)
	case MessageTypeSubmit:
		h.handleSubmit(conn, msg)
	case MessageTypePresence:
		h.handlePresence(conn, msg)
	default:
		h.logger.Warn("Unknown message type", zap.String("type", string(msg.Type)))
	}
}

// handlePing 处理心跳
func (h *Handler) handlePing(conn *Connection, msg *Message) {
	conn.mu.Lock()
	conn.LastPing = time.Now()
	conn.mu.Unlock()

	// 发送pong响应
	pongMsg := NewMessage(MessageTypePong, nil)
	select {
	case conn.Send <- pongMsg:
	default:
		h.logger.Error("Failed to send pong message")
	}
}

// handleSubscribe 处理订阅
func (h *Handler) handleSubscribe(conn *Connection, msg *Message) {
	if msg.Collection == "" {
		h.sendError(conn, msg.ID, 400, "collection is required")
		return
	}

	channel := msg.Collection
	if msg.Document != "" {
		channel = fmt.Sprintf("%s.%s", msg.Collection, msg.Document)
	}

	h.manager.Subscribe(conn.ID, channel)

	// 发送订阅确认
	response := NewMessage(MessageTypeSubscribe, map[string]string{
		"channel": channel,
		"status":  "subscribed",
	})
	response.ID = msg.ID

	select {
	case conn.Send <- response:
	default:
		h.logger.Error("Failed to send subscribe response")
	}
}

// handleUnsubscribe 处理取消订阅
func (h *Handler) handleUnsubscribe(conn *Connection, msg *Message) {
	if msg.Collection == "" {
		h.sendError(conn, msg.ID, 400, "collection is required")
		return
	}

	channel := msg.Collection
	if msg.Document != "" {
		channel = fmt.Sprintf("%s.%s", msg.Collection, msg.Document)
	}

	h.manager.Unsubscribe(conn.ID, channel)

	// 发送取消订阅确认
	response := NewMessage(MessageTypeUnsubscribe, map[string]string{
		"channel": channel,
		"status":  "unsubscribed",
	})
	response.ID = msg.ID

	select {
	case conn.Send <- response:
	default:
		h.logger.Error("Failed to send unsubscribe response")
	}
}

// handleQuery 处理查询
func (h *Handler) handleQuery(conn *Connection, msg *Message) {
	// 实现查询逻辑（参考 teable-develop 的 ShareDB 查询）
	h.logger.Info("Query message received",
		zap.String("collection", msg.Collection),
		zap.String("document", msg.Document))

	// 从 ShareDB 或数据库查询数据
	// 这里可以根据 collection 类型查询不同的数据源
	var data []interface{}

	// 例如：如果是查询表格数据
	if msg.Collection != "" && msg.Document != "" {
		// 这里应该调用相应的服务获取数据
		// 简化实现：返回空数据
		data = []interface{}{}
	}

	// 发送查询响应
	response := NewMessage(MessageTypeQueryResponse, QueryResponse{
		Data: data,
	})
	response.ID = msg.ID

	select {
	case conn.Send <- response:
		h.logger.Debug("Query response sent",
			zap.String("collection", msg.Collection),
			zap.Int("data_count", len(data)))
	default:
		h.logger.Error("Failed to send query response")
	}
}

// handleSubmit 处理提交
func (h *Handler) handleSubmit(conn *Connection, msg *Message) {
	// 实现提交逻辑（参考 teable-develop 的 ShareDB submit）
	h.logger.Info("Submit message received",
		zap.String("collection", msg.Collection),
		zap.String("document", msg.Document),
	)

	// ShareDB 提交操作：
	// 1. 验证操作权限
	// 2. 应用操作到文档
	// 3. 广播变更到其他客户端
	// 4. 返回提交响应

	// 简化实现：直接返回成功
	// 完整实现需要集成 ShareDB 的 OT (Operational Transformation) 逻辑
	response := NewMessage(MessageTypeSubmitResponse, SubmitResponse{})
	response.ID = msg.ID

	select {
	case conn.Send <- response:
		h.logger.Debug("Submit response sent",
			zap.String("collection", msg.Collection),
			zap.String("document", msg.Document))
	default:
		h.logger.Error("Failed to send submit response")
	}
}

// handlePresence 处理在线状态
func (h *Handler) handlePresence(conn *Connection, msg *Message) {
	// 实现在线状态逻辑（参考 teable-develop 的 presence 机制）
	h.logger.Info("Presence message received",
		zap.String("collection", msg.Collection),
		zap.String("user_id", conn.UserID))

	// Presence 更新：
	// 1. 更新用户的在线状态
	// 2. 广播到同一 collection 的其他用户
	// 3. 维护在线用户列表

	if msg.Collection != "" && conn.UserID != "" {
		// 更新或创建 presence 信息
		presenceData := map[string]interface{}{
			"user_id":    conn.UserID,
			"collection": msg.Collection,
			"timestamp":  time.Now().Unix(),
			"online":     true,
		}

		// 广播 presence 更新到其他客户端
		h.broadcastPresence(msg.Collection, presenceData)

		h.logger.Debug("Presence updated",
			zap.String("collection", msg.Collection),
			zap.String("user_id", conn.UserID))
	}
}

// broadcastPresence 广播在线状态
func (h *Handler) broadcastPresence(collection string, data map[string]interface{}) {
	// 获取同一 collection 的所有连接
	// 简化实现：从 manager 的所有连接中过滤出匹配的 collection
	h.manager.mu.RLock()
	defer h.manager.mu.RUnlock()

	// 创建 presence 广播消息
	msg := NewMessage(MessageTypePresence, data)
	msg.Collection = collection

	// 发送给所有连接（简化实现）
	for _, conn := range h.manager.connections {
		select {
		case conn.Send <- msg:
		default:
			// 发送失败，跳过
		}
	}
}

// sendError 发送错误消息
func (h *Handler) sendError(conn *Connection, msgID string, code int, message string) {
	errorMsg := NewErrorMessage(code, message)
	errorMsg.ID = msgID

	select {
	case conn.Send <- errorMsg:
	default:
		h.logger.Error("Failed to send error message")
	}
}

// generateConnectionID 生成连接ID
func generateConnectionID() string {
	return fmt.Sprintf("conn_%d", time.Now().UnixNano())
}
