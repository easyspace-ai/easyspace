package realtime

import (
	"context"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/easyspace-ai/luckdb/server/internal/events"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"go.uber.org/zap"
)

// Manager 实时通信管理器
// 集成 Yjs 协作和 SSE 数据同步，用于替换 ShareDB
type Manager struct {
	// 基础 WebSocket 管理器（保留兼容性）
	clients    map[string]*Client
	channels   map[string]map[string]*Client
	wsUpgrader websocket.Upgrader

	// YJS 和 SSE 管理器
	yjsManager *YjsManager // 基于新YJS库的管理器
	sseManager *SSEManager

	// 业务事件管理器
	businessEventManager *events.BusinessEventManager

	logger *zap.Logger
	mu     sync.RWMutex
	ctx    context.Context
	cancel context.CancelFunc
}

// Client 客户端连接
type Client struct {
	ID       string
	Conn     *websocket.Conn
	UserID   string
	Channels map[string]bool
	LastSeen time.Time
	IsActive bool
	mu       sync.RWMutex
}

// Message 消息结构
type Message struct {
	Type      string      `json:"type"`
	Channel   string      `json:"channel,omitempty"`
	Data      interface{} `json:"data"`
	Timestamp int64       `json:"timestamp"`
	UserID    string      `json:"user_id,omitempty"`
}

// NewManager 创建实时通信管理器
func NewManager(logger *zap.Logger) *Manager {
	ctx, cancel := context.WithCancel(context.Background())

	// 创建业务事件管理器
	businessEventManager := events.NewBusinessEventManager(logger)

	manager := &Manager{
		clients:  make(map[string]*Client),
		channels: make(map[string]map[string]*Client),
		wsUpgrader: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				return true // 在生产环境中应该检查来源
			},
			ReadBufferSize:   1024,
			WriteBufferSize:  1024,
			HandshakeTimeout: 10 * time.Second,
		},
		businessEventManager: businessEventManager,
		logger:               logger,
		ctx:                  ctx,
		cancel:               cancel,
	}

	// 初始化 YJS 和 SSE 管理器，传入业务事件管理器
	manager.yjsManager = NewYjsManager(logger, businessEventManager) // 基于新YJS库
	manager.sseManager = NewSSEManager(logger, businessEventManager)

	return manager
}

// GetBusinessEventManager 获取业务事件管理器
func (m *Manager) GetBusinessEventManager() *events.BusinessEventManager {
	return m.businessEventManager
}

// HandleWebSocket 处理 WebSocket 连接
func (m *Manager) HandleWebSocket(c *gin.Context) {
	// 升级到 WebSocket
	conn, err := m.wsUpgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		m.logger.Error("Failed to upgrade WebSocket connection", zap.Error(err))
		return
	}
	defer conn.Close()

	// 创建客户端
	clientID := c.Query("client_id")
	if clientID == "" {
		clientID = fmt.Sprintf("client_%d", time.Now().UnixNano())
	}

	userID := c.Query("user_id")

	client := &Client{
		ID:       clientID,
		Conn:     conn,
		UserID:   userID,
		Channels: make(map[string]bool),
		LastSeen: time.Now(),
		IsActive: true,
	}

	// 注册客户端
	m.registerClient(client)
	defer m.unregisterClient(client)

	// 发送连接确认
	m.sendToClient(client, Message{
		Type:      "connected",
		Data:      map[string]interface{}{"client_id": clientID},
		Timestamp: time.Now().Unix(),
	})

	// 处理消息
	m.handleClientMessages(client)
}

// registerClient 注册客户端
func (m *Manager) registerClient(client *Client) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.clients[client.ID] = client
	m.logger.Info("Client registered",
		zap.String("client_id", client.ID),
		zap.String("user_id", client.UserID))
}

// unregisterClient 取消注册客户端
func (m *Manager) unregisterClient(client *Client) {
	m.mu.Lock()
	defer m.mu.Unlock()

	// 从所有频道移除
	for channel := range client.Channels {
		if m.channels[channel] != nil {
			delete(m.channels[channel], client.ID)
			if len(m.channels[channel]) == 0 {
				delete(m.channels, channel)
			}
		}
	}

	delete(m.clients, client.ID)
	m.logger.Info("Client unregistered", zap.String("client_id", client.ID))
}

// handleClientMessages 处理客户端消息
func (m *Manager) handleClientMessages(client *Client) {
	defer func() {
		if r := recover(); r != nil {
			m.logger.Error("Panic in client message handler", zap.Any("panic", r))
		}
	}()

	for {
		var msg Message
		if err := client.Conn.ReadJSON(&msg); err != nil {
			// 检查是否是正常的连接关闭
			if websocket.IsCloseError(err, websocket.CloseNormalClosure, websocket.CloseGoingAway, websocket.CloseNoStatusReceived) {
				m.logger.Info("WebSocket connection closed normally",
					zap.Error(err),
					zap.String("client_id", client.ID))
			} else if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure, websocket.CloseNoStatusReceived) {
				m.logger.Error("WebSocket unexpected close",
					zap.Error(err),
					zap.String("client_id", client.ID))
			} else {
				m.logger.Debug("WebSocket connection closed",
					zap.Error(err),
					zap.String("client_id", client.ID))
			}
			break
		}

		client.mu.Lock()
		client.LastSeen = time.Now()
		client.mu.Unlock()

		// 处理不同类型的消息
		switch msg.Type {
		case "subscribe":
			m.handleSubscribe(client, msg)
		case "unsubscribe":
			m.handleUnsubscribe(client, msg)
		case "ping":
			m.handlePing(client)
		case "broadcast":
			m.handleBroadcast(client, msg)
		default:
			m.logger.Warn("Unknown message type", zap.String("type", msg.Type))
		}
	}
}

// handleSubscribe 处理订阅
func (m *Manager) handleSubscribe(client *Client, msg Message) {
	channel, ok := msg.Data.(string)
	if !ok {
		m.sendError(client, "Invalid channel name")
		return
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	// 添加到频道
	if m.channels[channel] == nil {
		m.channels[channel] = make(map[string]*Client)
	}
	m.channels[channel][client.ID] = client

	// 添加到客户端频道列表
	client.mu.Lock()
	client.Channels[channel] = true
	client.mu.Unlock()

	m.logger.Info("Client subscribed to channel",
		zap.String("client_id", client.ID),
		zap.String("channel", channel))

	// 发送确认
	m.sendToClient(client, Message{
		Type:      "subscribed",
		Data:      map[string]interface{}{"channel": channel},
		Timestamp: time.Now().Unix(),
	})
}

// handleUnsubscribe 处理取消订阅
func (m *Manager) handleUnsubscribe(client *Client, msg Message) {
	channel, ok := msg.Data.(string)
	if !ok {
		m.sendError(client, "Invalid channel name")
		return
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	// 从频道移除
	if m.channels[channel] != nil {
		delete(m.channels[channel], client.ID)
		if len(m.channels[channel]) == 0 {
			delete(m.channels, channel)
		}
	}

	// 从客户端频道列表移除
	client.mu.Lock()
	delete(client.Channels, channel)
	client.mu.Unlock()

	m.logger.Info("Client unsubscribed from channel",
		zap.String("client_id", client.ID),
		zap.String("channel", channel))

	// 发送确认
	m.sendToClient(client, Message{
		Type:      "unsubscribed",
		Data:      map[string]interface{}{"channel": channel},
		Timestamp: time.Now().Unix(),
	})
}

// handlePing 处理 ping
func (m *Manager) handlePing(client *Client) {
	m.sendToClient(client, Message{
		Type:      "pong",
		Data:      map[string]interface{}{"timestamp": time.Now().Unix()},
		Timestamp: time.Now().Unix(),
	})
}

// handleBroadcast 处理广播
func (m *Manager) handleBroadcast(client *Client, msg Message) {
	channel, ok := msg.Data.(map[string]interface{})["channel"].(string)
	if !ok {
		m.sendError(client, "Invalid broadcast data")
		return
	}

	// 广播到频道
	m.BroadcastToChannel(channel, msg.Data)
}

// sendToClient 发送消息给客户端
func (m *Manager) sendToClient(client *Client, msg Message) {
	client.mu.RLock()
	if !client.IsActive {
		client.mu.RUnlock()
		return
	}
	client.mu.RUnlock()

	if err := client.Conn.WriteJSON(msg); err != nil {
		m.logger.Error("Failed to send message to client",
			zap.String("client_id", client.ID),
			zap.Error(err))
		client.mu.Lock()
		client.IsActive = false
		client.mu.Unlock()
	}
}

// sendError 发送错误消息
func (m *Manager) sendError(client *Client, errorMsg string) {
	m.sendToClient(client, Message{
		Type:      "error",
		Data:      map[string]interface{}{"message": errorMsg},
		Timestamp: time.Now().Unix(),
	})
}

// BroadcastToChannel 向频道广播消息
func (m *Manager) BroadcastToChannel(channel string, data interface{}) {
	m.mu.RLock()
	clients := m.channels[channel]
	m.mu.RUnlock()

	if clients == nil {
		return
	}

	msg := Message{
		Type:      "broadcast",
		Channel:   channel,
		Data:      data,
		Timestamp: time.Now().Unix(),
	}

	for _, client := range clients {
		m.sendToClient(client, msg)
	}

	m.logger.Debug("Message broadcasted to channel",
		zap.String("channel", channel),
		zap.Int("clients", len(clients)))
}

// BroadcastToUser 向用户广播消息
func (m *Manager) BroadcastToUser(userID string, data interface{}) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	msg := Message{
		Type:      "user_message",
		Data:      data,
		Timestamp: time.Now().Unix(),
		UserID:    userID,
	}

	for _, client := range m.clients {
		if client.UserID == userID {
			m.sendToClient(client, msg)
		}
	}
}

// GetStats 获取统计信息
func (m *Manager) GetStats() map[string]interface{} {
	m.mu.RLock()
	defer m.mu.RUnlock()

	stats := map[string]interface{}{
		"clients":  len(m.clients),
		"channels": len(m.channels),
	}

	// 添加YJS管理器的统计信息
	if m.yjsManager != nil {
		stats["yjs"] = m.yjsManager.GetStats()
	}

	// 添加SSE管理器的统计信息
	if m.sseManager != nil {
		stats["sse"] = m.sseManager.GetStats()
	}

	return stats
}

// HandleYjsWebSocket 处理 YJS WebSocket 连接
func (m *Manager) HandleYjsWebSocket(c *gin.Context) {
	if m.yjsManager != nil {
		m.yjsManager.HandleWebSocket(c)
	} else {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "YJS service not available",
		})
	}
}

// HandleSSE 处理 SSE 连接
func (m *Manager) HandleSSE(c *gin.Context) {
	if m.sseManager != nil {
		m.sseManager.HandleSSE(c)
	} else {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "SSE service not available",
		})
	}
}

// HandleSSESubscription 处理 SSE 订阅
func (m *Manager) HandleSSESubscription(c *gin.Context) {
	if m.sseManager != nil {
		m.sseManager.HandleSubscription(c)
	} else {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "SSE service not available",
		})
	}
}

// BroadcastRecordCreate 广播记录创建事件
func (m *Manager) BroadcastRecordCreate(record interface{}) error {
	var errors []error

	// 通过 SSE 广播
	if m.sseManager != nil {
		if err := m.sseManager.BroadcastRecordCreate(record); err != nil {
			errors = append(errors, fmt.Errorf("sse broadcast failed: %w", err))
		}
	}

	// 通过基础 WebSocket 广播
	m.BroadcastToChannel("records", map[string]interface{}{
		"action": "create",
		"record": record,
	})

	if len(errors) > 0 {
		return fmt.Errorf("broadcast errors: %v", errors)
	}

	return nil
}

// BroadcastRecordUpdate 广播记录更新事件
func (m *Manager) BroadcastRecordUpdate(record interface{}) error {
	var errors []error

	// 通过 SSE 广播
	if m.sseManager != nil {
		if err := m.sseManager.BroadcastRecordUpdate(record); err != nil {
			errors = append(errors, fmt.Errorf("sse broadcast failed: %w", err))
		}
	}

	// 通过基础 WebSocket 广播
	m.BroadcastToChannel("records", map[string]interface{}{
		"action": "update",
		"record": record,
	})

	if len(errors) > 0 {
		return fmt.Errorf("broadcast errors: %v", errors)
	}

	return nil
}

// BroadcastRecordDelete 广播记录删除事件
func (m *Manager) BroadcastRecordDelete(record interface{}) error {
	var errors []error

	// 通过 SSE 广播
	if m.sseManager != nil {
		if err := m.sseManager.BroadcastRecordDelete(record); err != nil {
			errors = append(errors, fmt.Errorf("sse broadcast failed: %w", err))
		}
	}

	// 通过基础 WebSocket 广播
	m.BroadcastToChannel("records", map[string]interface{}{
		"action": "delete",
		"record": record,
	})

	if len(errors) > 0 {
		return fmt.Errorf("broadcast errors: %v", errors)
	}

	return nil
}

// GetYjsManager 获取 YJS 管理器
func (m *Manager) GetYjsManager() *YjsManager {
	return m.yjsManager
}

// GetSSEManager 获取 SSE 管理器
func (m *Manager) GetSSEManager() *SSEManager {
	return m.sseManager
}

// Shutdown 关闭管理器
func (m *Manager) Shutdown() error {
	m.cancel()

	m.mu.Lock()
	defer m.mu.Unlock()

	// 关闭所有客户端连接
	for _, client := range m.clients {
		client.Conn.Close()
	}

	// 关闭 YJS 管理器
	if m.yjsManager != nil {
		m.yjsManager.Shutdown()
	}

	// 关闭 SSE 管理器
	if m.sseManager != nil {
		m.sseManager.Shutdown()
	}

	m.logger.Info("Realtime manager shutdown completed")
	return nil
}
