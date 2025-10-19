package realtime

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"sync"
	"time"

	"github.com/easyspace-ai/luckdb/server/internal/events"
	"github.com/easyspace-ai/luckdb/server/pkg/yjs"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"go.uber.org/zap"
)

// YjsManager 基于新YJS库的协作管理器
// 使用pkg/yjs库提供完整的CRDT支持
type YjsManager struct {
	// 文档管理
	documents map[string]*YjsDocument

	// 连接管理
	connections map[string]*YjsConnection

	// 持久化
	persistence *YjsPersistence

	// 感知管理
	awareness *AwarenessManager

	// 业务事件订阅器
	businessEvents events.BusinessEventSubscriber

	// WebSocket升级器
	wsUpgrader websocket.Upgrader

	// 日志记录器
	logger *zap.Logger

	// 互斥锁
	mu sync.RWMutex

	// 上下文
	ctx    context.Context
	cancel context.CancelFunc
}

// YjsDocument 基于新YJS库的文档
type YjsDocument struct {
	ID        string
	Doc       *yjs.Doc
	Sessions  map[string]*YjsSession
	CreatedAt time.Time
	UpdatedAt time.Time
	mu        sync.RWMutex
}

// YjsSession 基于新YJS库的会话
type YjsSession struct {
	ID         string
	DocumentID string
	UserID     string
	Conn       *websocket.Conn
	LastSeen   time.Time
	IsActive   bool
	mu         sync.RWMutex
}

// YjsConnection 基于新YJS库的连接
type YjsConnection struct {
	ID       string
	UserID   string
	Conn     *websocket.Conn
	Sessions map[string]*YjsSession
	LastSeen time.Time
	IsActive bool
	mu       sync.RWMutex
}

// YjsMessage 基于新YJS库的消息
type YjsMessage struct {
	Type      string          `json:"type"`
	Document  string          `json:"document,omitempty"`
	Update    json.RawMessage `json:"update,omitempty"`
	State     json.RawMessage `json:"state,omitempty"`
	Awareness json.RawMessage `json:"awareness,omitempty"`
	UserID    string          `json:"user_id,omitempty"`
}

// convertJSONToBytes 将 JSON 数据转换为字节数组
// 处理两种情况：
// 1. 如果是数组格式 [1,2,3,...]，直接转换
// 2. 如果是对象格式 {"0":1,"1":2,...}，转换为数组
func convertJSONToBytes(data json.RawMessage) ([]byte, error) {
	if len(data) == 0 {
		return nil, nil
	}

	// 尝试直接解析为字节数组
	var bytes []byte
	if err := json.Unmarshal(data, &bytes); err == nil {
		return bytes, nil
	}

	// 如果失败，尝试解析为对象格式并转换
	var obj map[string]interface{}
	if err := json.Unmarshal(data, &obj); err != nil {
		return nil, fmt.Errorf("无法解析为字节数组或对象: %w", err)
	}

	// 将对象转换为字节数组
	result := make([]byte, len(obj))
	for key, value := range obj {
		if index, err := strconv.Atoi(key); err == nil && index >= 0 && index < len(obj) {
			if num, ok := value.(float64); ok {
				result[index] = byte(num)
			} else {
				return nil, fmt.Errorf("对象值不是数字: key=%s, value=%v", key, value)
			}
		}
	}

	return result, nil
}

// YjsPersistence 基于新YJS库的持久化
type YjsPersistence struct {
	// 这里可以集成您的数据库
	// 例如：PostgreSQL、Redis 等
	logger *zap.Logger
}

// AwarenessManager 基于新YJS库的感知管理器
type AwarenessManager struct {
	users map[string]map[string]*UserAwareness // documentID -> userID -> awareness
	mu    sync.RWMutex
}

// UserAwareness 基于新YJS库的用户感知信息
type UserAwareness struct {
	UserID   string                 `json:"user_id"`
	Document string                 `json:"document"`
	State    map[string]interface{} `json:"state"`
	LastSeen time.Time              `json:"last_seen"`
	IsActive bool                   `json:"is_active"`
}

// NewYjsManager 创建基于新YJS库的协作管理器
func NewYjsManager(logger *zap.Logger, businessEvents events.BusinessEventSubscriber) *YjsManager {
	ctx, cancel := context.WithCancel(context.Background())

	manager := &YjsManager{
		documents:      make(map[string]*YjsDocument),
		connections:    make(map[string]*YjsConnection),
		persistence:    &YjsPersistence{logger: logger},
		awareness:      &AwarenessManager{users: make(map[string]map[string]*UserAwareness)},
		businessEvents: businessEvents,
		wsUpgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true // 在生产环境中应该进行更严格的检查
			},
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
		},
		logger: logger,
		ctx:    ctx,
		cancel: cancel,
	}

	// 启动清理协程
	go manager.cleanupRoutine()

	// 启动业务事件监听
	if businessEvents != nil {
		go manager.startBusinessEventSubscription()
	}

	return manager
}

// HandleWebSocket 处理基于新YJS库的WebSocket连接
func (ym *YjsManager) HandleWebSocket(c *gin.Context) {
	// 升级到WebSocket
	conn, err := ym.wsUpgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		ym.logger.Error("Failed to upgrade Yjs WebSocket connection", zap.Error(err))
		return
	}
	defer conn.Close()

	// 获取连接参数
	documentID := c.Query("document")
	userID := c.Query("user")

	if documentID == "" || userID == "" {
		ym.logger.Error("Missing required parameters: document and user")
		return
	}

	// 创建连接
	connectionID := fmt.Sprintf("conn_%d", time.Now().UnixNano())
	connection := &YjsConnection{
		ID:       connectionID,
		UserID:   userID,
		Conn:     conn,
		Sessions: make(map[string]*YjsSession),
		LastSeen: time.Now(),
		IsActive: true,
	}

	// 注册连接
	ym.registerConnection(connection)
	defer ym.unregisterConnection(connection)

	// 创建或获取文档
	document := ym.getOrCreateDocument(documentID)

	// 创建会话
	session := &YjsSession{
		ID:         fmt.Sprintf("session_%d", time.Now().UnixNano()),
		DocumentID: documentID,
		UserID:     userID,
		Conn:       conn,
		LastSeen:   time.Now(),
		IsActive:   true,
	}

	// 注册会话
	ym.registerSession(document, session)
	defer ym.unregisterSession(document, session)

	// 发送连接确认
	ym.sendToConnection(connection, YjsMessage{
		Type:     "connected",
		Document: documentID,
		UserID:   userID,
	})

	// 处理消息
	ym.handleConnectionMessages(connection, session, document)
}

// getOrCreateDocument 获取或创建文档
func (ym *YjsManager) getOrCreateDocument(documentID string) *YjsDocument {
	ym.mu.Lock()
	defer ym.mu.Unlock()

	document, exists := ym.documents[documentID]
	if !exists {
		// 创建新的YJS文档
		doc := yjs.NewDoc(documentID, true, yjs.DefaultGCFilter, nil, true)

		document = &YjsDocument{
			ID:        documentID,
			Doc:       doc,
			Sessions:  make(map[string]*YjsSession),
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}

		ym.documents[documentID] = document

		// 设置文档事件监听器
		ym.setupDocumentListeners(document)

		ym.logger.Info("Created new Yjs document",
			zap.String("document_id", documentID))
	}

	return document
}

// setupDocumentListeners 设置文档事件监听器
func (ym *YjsManager) setupDocumentListeners(document *YjsDocument) {
	// 监听文档更新事件
	document.Doc.On("update", &yjs.ObserverHandler{
		Callback: func(v ...interface{}) {
			if len(v) >= 4 {
				update := v[0].([]byte)
				origin := v[1]
				trans := v[3].(*yjs.Transaction)

				ym.handleDocumentUpdate(document, update, origin, trans)
			}
		},
	})

	// 监听事务完成事件
	document.Doc.On("afterTransaction", &yjs.ObserverHandler{
		Callback: func(v ...interface{}) {
			if len(v) >= 2 {
				trans := v[0].(*yjs.Transaction)

				ym.handleTransactionComplete(document, trans)
			}
		},
	})
}

// handleDocumentUpdate 处理文档更新
func (ym *YjsManager) handleDocumentUpdate(document *YjsDocument, update []byte, origin interface{}, trans *yjs.Transaction) {
	// 更新文档时间戳
	document.mu.Lock()
	document.UpdatedAt = time.Now()
	document.mu.Unlock()

	// 广播更新给其他会话
	ym.broadcastUpdate(document, update, origin)

	ym.logger.Debug("Document updated",
		zap.String("document_id", document.ID),
		zap.Int("update_size", len(update)),
		zap.Any("origin", origin))
}

// handleTransactionComplete 处理事务完成
func (ym *YjsManager) handleTransactionComplete(document *YjsDocument, trans *yjs.Transaction) {
	ym.logger.Debug("Transaction completed",
		zap.String("document_id", document.ID),
		zap.Bool("local", trans.Local))
}

// broadcastUpdate 广播更新
func (ym *YjsManager) broadcastUpdate(document *YjsDocument, update []byte, origin interface{}) {
	document.mu.RLock()
	sessions := make([]*YjsSession, 0, len(document.Sessions))
	for _, session := range document.Sessions {
		if session.IsActive {
			sessions = append(sessions, session)
		}
	}
	document.mu.RUnlock()

	// 发送更新给所有活跃会话
	for _, session := range sessions {
		// 跳过发送更新的源会话
		if origin != nil && origin == session.ID {
			continue
		}

		// 将字节数组转换为数组格式（YJS 标准格式）
		updateArray := make([]int, len(update))
		for i, b := range update {
			updateArray[i] = int(b)
		}

		updateJSON, err := json.Marshal(updateArray)
		if err != nil {
			ym.logger.Error("Failed to marshal update in broadcastUpdate", zap.Error(err))
			continue
		}

		ym.sendToSession(session, YjsMessage{
			Type:     "update",
			Document: document.ID,
			Update:   json.RawMessage(updateJSON),
		})
	}
}

// registerConnection 注册连接
func (ym *YjsManager) registerConnection(conn *YjsConnection) {
	ym.mu.Lock()
	defer ym.mu.Unlock()

	ym.connections[conn.ID] = conn
	ym.logger.Info("Yjs connection registered",
		zap.String("connection_id", conn.ID),
		zap.String("user_id", conn.UserID))
}

// unregisterConnection 取消注册连接
func (ym *YjsManager) unregisterConnection(conn *YjsConnection) {
	ym.mu.Lock()
	defer ym.mu.Unlock()

	delete(ym.connections, conn.ID)
	ym.logger.Info("Yjs connection unregistered",
		zap.String("connection_id", conn.ID),
		zap.String("user_id", conn.UserID))
}

// registerSession 注册会话
func (ym *YjsManager) registerSession(document *YjsDocument, session *YjsSession) {
	document.mu.Lock()
	defer document.mu.Unlock()

	document.Sessions[session.ID] = session
	ym.logger.Info("Yjs session registered",
		zap.String("session_id", session.ID),
		zap.String("document_id", session.DocumentID),
		zap.String("user_id", session.UserID))
}

// unregisterSession 取消注册会话
func (ym *YjsManager) unregisterSession(document *YjsDocument, session *YjsSession) {
	document.mu.Lock()
	defer document.mu.Unlock()

	delete(document.Sessions, session.ID)
	ym.logger.Info("Yjs session unregistered",
		zap.String("session_id", session.ID),
		zap.String("document_id", session.DocumentID),
		zap.String("user_id", session.UserID))
}

// handleConnectionMessages 处理连接消息
func (ym *YjsManager) handleConnectionMessages(conn *YjsConnection, session *YjsSession, document *YjsDocument) {
	defer func() {
		if r := recover(); r != nil {
			ym.logger.Error("Panic in Yjs connection message handler", zap.Any("panic", r))
		}
	}()

	for {
		// 读取消息类型
		messageType, data, err := conn.Conn.ReadMessage()
		if err != nil {
			if websocket.IsCloseError(err, websocket.CloseNormalClosure, websocket.CloseGoingAway, websocket.CloseNoStatusReceived) {
				ym.logger.Info("Yjs WebSocket connection closed normally",
					zap.Error(err),
					zap.String("connection_id", conn.ID))
			} else if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure, websocket.CloseNoStatusReceived) {
				ym.logger.Error("Yjs WebSocket unexpected close",
					zap.Error(err),
					zap.String("connection_id", conn.ID))
			} else {
				ym.logger.Debug("Yjs WebSocket connection closed",
					zap.Error(err),
					zap.String("connection_id", conn.ID))
			}
			break
		}

		conn.mu.Lock()
		conn.LastSeen = time.Now()
		conn.mu.Unlock()

		// 处理不同类型的消息
		switch messageType {
		case websocket.TextMessage:
			// 处理文本消息（JSON格式）
			var msg YjsMessage
			if err := json.Unmarshal(data, &msg); err != nil {
				ym.logger.Error("Failed to parse Yjs JSON message", zap.Error(err))
				continue
			}
			ym.handleYjsMessage(session, document, msg)
		case websocket.BinaryMessage:
			// 处理二进制消息（Yjs协议消息）
			ym.handleYjsBinaryMessage(session, document, data)
		default:
			ym.logger.Warn("Unknown message type", zap.Int("type", messageType))
		}
	}
}

// handleYjsMessage 处理Yjs JSON消息
func (ym *YjsManager) handleYjsMessage(session *YjsSession, document *YjsDocument, msg YjsMessage) {
	ym.logger.Info("处理YJS消息",
		zap.String("type", msg.Type),
		zap.String("session_id", session.ID),
		zap.String("document_id", document.ID),
		zap.String("user_id", session.UserID))

	switch msg.Type {
	case "sync":
		ym.handleSyncMessage(session, document, msg)
	case "sync_request":
		// 处理同步请求 - 发送初始状态
		ym.handleSyncRequest(session, document, msg)
	case "update":
		ym.logger.Info("收到更新消息",
			zap.String("session_id", session.ID),
			zap.String("document_id", document.ID),
			zap.String("user_id", session.UserID),
			zap.Int("update_size", len(msg.Update)))
		ym.handleUpdateMessage(session, document, msg)
	case "awareness":
		ym.handleAwarenessMessage(session, document, msg)
	case "ping":
		ym.handlePingMessage(session)
	default:
		ym.logger.Warn("Unknown message type", zap.String("type", msg.Type))
	}
}

// handleSyncRequest 处理同步请求
func (ym *YjsManager) handleSyncRequest(session *YjsSession, document *YjsDocument, msg YjsMessage) {
	ym.logger.Info("处理同步请求",
		zap.String("session_id", session.ID),
		zap.String("document_id", document.ID))

	// 发送初始状态向量
	ym.sendSyncStep1(session, document)
}

// handleSyncMessage 处理同步消息
func (ym *YjsManager) handleSyncMessage(session *YjsSession, document *YjsDocument, msg YjsMessage) {
	if len(msg.State) > 0 {
		// 客户端发送状态向量 - 同步步骤1
		stateBytes, err := convertJSONToBytes(msg.State)
		if err != nil {
			ym.logger.Error("Failed to convert state to bytes", zap.Error(err))
			return
		}
		ym.handleSyncStep1(session, document, stateBytes)
	} else {
		// 客户端请求同步 - 发送状态向量
		ym.sendSyncStep1(session, document)
	}
}

// sendSyncStep1 发送同步步骤1：状态向量
func (ym *YjsManager) sendSyncStep1(session *YjsSession, document *YjsDocument) {
	// 使用文档级别的读锁保护并发访问
	document.mu.RLock()
	defer document.mu.RUnlock()

	// 获取当前状态向量
	stateVector := yjs.GetStateVector(document.Doc.Store)

	// 将状态向量转换为 JSON 格式（数组格式）
	stateJSON, err := json.Marshal(stateVector)
	if err != nil {
		ym.logger.Error("Failed to marshal state vector", zap.Error(err))
		return
	}

	ym.logger.Info("发送状态向量",
		zap.String("session_id", session.ID),
		zap.String("document_id", document.ID),
		zap.Int("state_size", len(stateVector)))

	// 发送状态向量
	ym.sendToSession(session, YjsMessage{
		Type:     "sync",
		Document: document.ID,
		State:    stateJSON,
	})
}

// handleSyncStep1 处理同步步骤1：客户端状态向量
func (ym *YjsManager) handleSyncStep1(session *YjsSession, document *YjsDocument, clientStateVector []byte) {
	// 使用文档级别的读锁保护并发访问
	document.mu.RLock()
	defer document.mu.RUnlock()

	// 计算缺失的更新
	missingUpdates, err := ym.persistence.GetMissingUpdates(document.ID, clientStateVector)
	if err != nil {
		ym.logger.Error("Failed to get missing updates", zap.Error(err))
		return
	}

	// 发送缺失的更新
	for _, update := range missingUpdates {
		// 将字节数组转换为数组格式（YJS 标准格式）
		updateArray := make([]int, len(update))
		for i, b := range update {
			updateArray[i] = int(b)
		}

		updateJSON, err := json.Marshal(updateArray)
		if err != nil {
			ym.logger.Error("Failed to marshal update", zap.Error(err))
			continue
		}
		ym.sendToSession(session, YjsMessage{
			Type:     "sync",
			Document: document.ID,
			Update:   json.RawMessage(updateJSON),
		})
	}

	// 发送同步完成消息
	ym.sendToSession(session, YjsMessage{
		Type:     "sync_complete",
		Document: document.ID,
	})
}

// handleUpdateMessage 处理更新消息
func (ym *YjsManager) handleUpdateMessage(session *YjsSession, document *YjsDocument, msg YjsMessage) {
	// 将 JSON 数据转换为字节数组
	updateBytes, err := convertJSONToBytes(msg.Update)
	if err != nil {
		ym.logger.Error("Failed to convert update to bytes", zap.Error(err))
		return
	}

	// 使用文档级别的互斥锁保护并发访问
	document.mu.Lock()
	// 应用更新到文档
	yjs.ApplyUpdate(document.Doc, updateBytes, session.ID)
	document.mu.Unlock()

	ym.logger.Debug("Update applied",
		zap.String("session_id", session.ID),
		zap.String("document_id", document.ID),
		zap.Int("update_size", len(updateBytes)))

	// 广播更新到其他客户端（在锁外执行，避免死锁）
	ym.broadcastUpdateToOtherSessions(session, document, updateBytes)
}

// handleAwarenessMessage 处理感知消息
func (ym *YjsManager) handleAwarenessMessage(session *YjsSession, document *YjsDocument, msg YjsMessage) {
	// 处理用户感知信息
	ym.awareness.mu.Lock()
	if ym.awareness.users[document.ID] == nil {
		ym.awareness.users[document.ID] = make(map[string]*UserAwareness)
	}

	ym.awareness.users[document.ID][session.UserID] = &UserAwareness{
		UserID:   session.UserID,
		Document: document.ID,
		State:    make(map[string]interface{}),
		LastSeen: time.Now(),
		IsActive: true,
	}
	ym.awareness.mu.Unlock()

	ym.logger.Debug("Awareness updated",
		zap.String("session_id", session.ID),
		zap.String("document_id", document.ID),
		zap.String("user_id", session.UserID))
}

// handlePingMessage 处理ping消息
func (ym *YjsManager) handlePingMessage(session *YjsSession) {
	// 发送pong响应
	ym.sendToSession(session, YjsMessage{
		Type: "pong",
	})
}

// broadcastUpdateToOtherSessions 广播更新到其他会话
func (ym *YjsManager) broadcastUpdateToOtherSessions(senderSession *YjsSession, document *YjsDocument, updateBytes []byte) {
	document.mu.RLock()
	defer document.mu.RUnlock()

	// 将字节数组转换为数组格式（YJS 标准格式）
	updateArray := make([]int, len(updateBytes))
	for i, b := range updateBytes {
		updateArray[i] = int(b)
	}

	updateJSON, err := json.Marshal(updateArray)
	if err != nil {
		ym.logger.Error("Failed to marshal update to JSON", zap.Error(err))
		return
	}

	// 广播到所有其他活跃会话
	for sessionID, session := range document.Sessions {
		if sessionID != senderSession.ID && session.IsActive {
			updateMsg := YjsMessage{
				Type:     "update",
				Document: document.ID,
				Update:   json.RawMessage(updateJSON),
			}

			ym.sendToSession(session, updateMsg)

			ym.logger.Debug("Update broadcasted",
				zap.String("from_session", senderSession.ID),
				zap.String("to_session", sessionID),
				zap.String("document_id", document.ID))
		}
	}
}

// handleYjsBinaryMessage 处理Yjs二进制消息
func (ym *YjsManager) handleYjsBinaryMessage(session *YjsSession, document *YjsDocument, data []byte) {
	// 直接应用二进制更新
	yjs.ApplyUpdate(document.Doc, data, session.ID)

	ym.logger.Debug("Binary update applied",
		zap.String("session_id", session.ID),
		zap.String("document_id", document.ID),
		zap.Int("data_size", len(data)))

	// 广播二进制更新到其他客户端
	ym.broadcastBinaryUpdateToOtherSessions(session, document, data)
}

// broadcastBinaryUpdateToOtherSessions 广播二进制更新到其他会话
func (ym *YjsManager) broadcastBinaryUpdateToOtherSessions(senderSession *YjsSession, document *YjsDocument, data []byte) {
	document.mu.RLock()
	defer document.mu.RUnlock()

	// 广播到所有其他活跃会话
	for sessionID, session := range document.Sessions {
		if sessionID != senderSession.ID && session.IsActive {
			// 直接发送二进制数据
			session.mu.Lock()
			if session.IsActive {
				if err := session.Conn.WriteMessage(websocket.BinaryMessage, data); err != nil {
					ym.logger.Error("Failed to send binary update to session",
						zap.Error(err),
						zap.String("session_id", sessionID))
				} else {
					ym.logger.Debug("Binary update broadcasted",
						zap.String("from_session", senderSession.ID),
						zap.String("to_session", sessionID),
						zap.String("document_id", document.ID))
				}
			}
			session.mu.Unlock()
		}
	}
}

// sendToConnection 发送消息给连接
func (ym *YjsManager) sendToConnection(conn *YjsConnection, msg YjsMessage) {
	data, err := json.Marshal(msg)
	if err != nil {
		ym.logger.Error("Failed to marshal message", zap.Error(err))
		return
	}

	conn.mu.Lock()
	defer conn.mu.Unlock()

	if conn.IsActive {
		if err := conn.Conn.WriteMessage(websocket.TextMessage, data); err != nil {
			ym.logger.Error("Failed to send message to connection", zap.Error(err))
		}
	}
}

// sendToSession 发送消息给会话
func (ym *YjsManager) sendToSession(session *YjsSession, msg YjsMessage) {
	data, err := json.Marshal(msg)
	if err != nil {
		ym.logger.Error("Failed to marshal message", zap.Error(err))
		return
	}

	session.mu.Lock()
	defer session.mu.Unlock()

	if session.IsActive {
		if err := session.Conn.WriteMessage(websocket.TextMessage, data); err != nil {
			ym.logger.Error("Failed to send message to session", zap.Error(err))
		}
	}
}

// cleanupRoutine 清理协程
func (ym *YjsManager) cleanupRoutine() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ym.ctx.Done():
			return
		case <-ticker.C:
			ym.cleanupInactiveConnections()
		}
	}
}

// cleanupInactiveConnections 清理非活跃连接
func (ym *YjsManager) cleanupInactiveConnections() {
	ym.mu.Lock()
	defer ym.mu.Unlock()

	now := time.Now()
	timeout := 5 * time.Minute

	// 清理非活跃连接
	for connID, conn := range ym.connections {
		conn.mu.Lock()
		if now.Sub(conn.LastSeen) > timeout {
			conn.IsActive = false
			conn.Conn.Close()
			delete(ym.connections, connID)
			ym.logger.Info("Cleaned up inactive connection",
				zap.String("connection_id", connID))
		}
		conn.mu.Unlock()
	}

	// 清理非活跃会话
	for docID, document := range ym.documents {
		document.mu.Lock()
		for sessionID, session := range document.Sessions {
			session.mu.Lock()
			if now.Sub(session.LastSeen) > timeout {
				session.IsActive = false
				delete(document.Sessions, sessionID)
				ym.logger.Info("Cleaned up inactive session",
					zap.String("session_id", sessionID),
					zap.String("document_id", docID))
			}
			session.mu.Unlock()
		}
		document.mu.Unlock()
	}
}

// GetStats 获取统计信息
func (ym *YjsManager) GetStats() map[string]interface{} {
	ym.mu.RLock()
	defer ym.mu.RUnlock()

	activeConnections := 0
	activeSessions := 0

	for _, conn := range ym.connections {
		conn.mu.RLock()
		if conn.IsActive {
			activeConnections++
		}
		conn.mu.RUnlock()
	}

	for _, document := range ym.documents {
		document.mu.RLock()
		for _, session := range document.Sessions {
			session.mu.RLock()
			if session.IsActive {
				activeSessions++
			}
			session.mu.RUnlock()
		}
		document.mu.RUnlock()
	}

	return map[string]interface{}{
		"documents":          len(ym.documents),
		"connections":        len(ym.connections),
		"active_connections": activeConnections,
		"active_sessions":    activeSessions,
		"active_users":       ym.awareness.GetActiveUserCount(),
		"timestamp":          time.Now().Unix(),
	}
}

// Shutdown 关闭管理器
func (ym *YjsManager) Shutdown() {
	ym.cancel()

	ym.mu.Lock()
	defer ym.mu.Unlock()

	// 关闭所有连接
	for _, conn := range ym.connections {
		conn.Conn.Close()
	}

	// 销毁所有文档
	for _, document := range ym.documents {
		document.Doc.Destroy()
	}

	ym.logger.Info("YjsManager shutdown completed")
}

// startBusinessEventSubscription 启动业务事件订阅
func (ym *YjsManager) startBusinessEventSubscription() {
	if ym.businessEvents == nil {
		return
	}

	// 订阅所有业务事件类型
	eventTypes := []events.BusinessEventType{
		events.BusinessEventTypeTableCreate,
		events.BusinessEventTypeTableUpdate,
		events.BusinessEventTypeTableDelete,
		events.BusinessEventTypeFieldCreate,
		events.BusinessEventTypeFieldUpdate,
		events.BusinessEventTypeFieldDelete,
		events.BusinessEventTypeRecordCreate,
		events.BusinessEventTypeRecordUpdate,
		events.BusinessEventTypeRecordDelete,
		events.BusinessEventTypeCalculationUpdate,
	}

	eventChan, err := ym.businessEvents.Subscribe(ym.ctx, eventTypes)
	if err != nil {
		ym.logger.Error("订阅业务事件失败", zap.Error(err))
		return
	}

	ym.logger.Info("YjsManager 已订阅业务事件")

	// 监听业务事件
	for {
		select {
		case event, ok := <-eventChan:
			if !ok {
				ym.logger.Info("业务事件通道已关闭")
				return
			}
			ym.handleBusinessEvent(event)
		case <-ym.ctx.Done():
			ym.logger.Info("YjsManager 业务事件订阅已停止")
			return
		}
	}
}

// handleBusinessEvent 处理业务事件
func (ym *YjsManager) handleBusinessEvent(event *events.BusinessEvent) {
	// 将业务事件转换为YJS更新
	// 这里可以根据业务事件类型决定如何处理
	switch event.Type {
	case events.BusinessEventTypeRecordCreate,
		events.BusinessEventTypeRecordUpdate,
		events.BusinessEventTypeRecordDelete:
		// 记录相关事件：更新对应的YJS文档
		if event.TableID != "" && event.RecordID != "" {
			documentID := fmt.Sprintf("table:%s:record:%s", event.TableID, event.RecordID)
			ym.updateDocumentFromBusinessEvent(documentID, event)
		}

	case events.BusinessEventTypeFieldCreate,
		events.BusinessEventTypeFieldUpdate,
		events.BusinessEventTypeFieldDelete:
		// 字段相关事件：更新表结构文档
		if event.TableID != "" {
			documentID := fmt.Sprintf("table:%s:schema", event.TableID)
			ym.updateDocumentFromBusinessEvent(documentID, event)
		}

	case events.BusinessEventTypeTableCreate,
		events.BusinessEventTypeTableUpdate,
		events.BusinessEventTypeTableDelete:
		// 表相关事件：更新全局表列表文档
		documentID := "global:tables"
		ym.updateDocumentFromBusinessEvent(documentID, event)
	}

	ym.logger.Debug("业务事件已转换为YJS更新",
		zap.String("event_type", string(event.Type)),
		zap.String("table_id", event.TableID),
		zap.String("record_id", event.RecordID))
}

// updateDocumentFromBusinessEvent 根据业务事件更新YJS文档
func (ym *YjsManager) updateDocumentFromBusinessEvent(documentID string, event *events.BusinessEvent) {
	ym.mu.Lock()
	defer ym.mu.Unlock()

	// 获取或创建文档
	doc, exists := ym.documents[documentID]
	if !exists {
		// 创建新的YJS文档
		yjsDoc := yjs.NewDoc(documentID, true, yjs.DefaultGCFilter, nil, true)

		doc = &YjsDocument{
			ID:        documentID,
			Doc:       yjsDoc,
			Sessions:  make(map[string]*YjsSession),
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		}
		ym.documents[documentID] = doc

		// 设置文档事件监听器
		ym.setupDocumentListeners(doc)
	}

	// 创建业务事件更新
	updateData := map[string]interface{}{
		"type":      string(event.Type),
		"table_id":  event.TableID,
		"record_id": event.RecordID,
		"field_id":  event.FieldID,
		"data":      event.Data,
		"user_id":   event.UserID,
		"version":   event.Version,
		"timestamp": event.Timestamp,
	}

	// 序列化更新数据
	updateBytes, err := json.Marshal(updateData)
	if err != nil {
		ym.logger.Error("序列化业务事件更新失败", zap.Error(err))
		return
	}

	// 在YJS文档中应用更新
	doc.Doc.Transact(func(trans *yjs.Transaction) {
		// 将业务事件数据存储到YJS文档中
		yMap := doc.Doc.GetMap("business_events")
		if yMapObj, ok := yMap.(*yjs.YMap); ok {
			eventKey := fmt.Sprintf("event_%d", time.Now().UnixNano())
			yMapObj.Set(eventKey, updateBytes)
		}
	}, "business_event")

	// 更新文档时间戳
	doc.mu.Lock()
	doc.UpdatedAt = time.Now()
	doc.mu.Unlock()

	// 广播更新到所有连接的会话
	for _, session := range doc.Sessions {
		if session.IsActive {
			// 将字节数组转换为数组格式（YJS 标准格式）
			updateArray := make([]int, len(updateBytes))
			for i, b := range updateBytes {
				updateArray[i] = int(b)
			}

			updateJSON, err := json.Marshal(updateArray)
			if err != nil {
				ym.logger.Error("Failed to marshal business event update", zap.Error(err))
				continue
			}

			// 发送更新消息
			updateMsg := YjsMessage{
				Type:     "business_event",
				Document: documentID,
				Update:   json.RawMessage(updateJSON),
			}

			ym.sendToSession(session, updateMsg)
		}
	}
}

// 持久化方法
func (yp *YjsPersistence) SaveUpdate(documentID string, update []byte) error {
	// 这里应该实现更新保存到数据库的逻辑
	// 例如：保存到 PostgreSQL、Redis 等
	yp.logger.Info("Saving YJS update",
		zap.String("document_id", documentID),
		zap.Int("update_size", len(update)))
	return nil
}

func (yp *YjsPersistence) GetMissingUpdates(documentID string, stateVector []byte) ([][]byte, error) {
	// 这里应该实现根据状态向量获取缺失更新的逻辑
	// 暂时返回空数组
	return [][]byte{}, nil
}

// 感知管理器方法
func (am *AwarenessManager) UpdateUser(documentID string, awareness *UserAwareness) {
	am.mu.Lock()
	defer am.mu.Unlock()

	if am.users[documentID] == nil {
		am.users[documentID] = make(map[string]*UserAwareness)
	}

	am.users[documentID][awareness.UserID] = awareness
}

func (am *AwarenessManager) RemoveUser(documentID, userID string) {
	am.mu.Lock()
	defer am.mu.Unlock()

	if am.users[documentID] != nil {
		delete(am.users[documentID], userID)
	}
}

func (am *AwarenessManager) GetUsers(documentID string) []*UserAwareness {
	am.mu.RLock()
	defer am.mu.RUnlock()

	users := make([]*UserAwareness, 0)
	if am.users[documentID] != nil {
		for _, user := range am.users[documentID] {
			users = append(users, user)
		}
	}

	return users
}

func (am *AwarenessManager) EncodeUsers(users []*UserAwareness) []byte {
	// 这里应该实现感知信息的编码逻辑
	// 暂时返回简单的 JSON 编码
	data, _ := json.Marshal(users)
	return data
}

func (am *AwarenessManager) GetActiveUserCount() int {
	am.mu.RLock()
	defer am.mu.RUnlock()

	count := 0
	for _, docUsers := range am.users {
		count += len(docUsers)
	}

	return count
}
