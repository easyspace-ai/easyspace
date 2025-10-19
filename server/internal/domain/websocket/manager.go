package websocket

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/easyspace-ai/luckdb/server/internal/events"
	"github.com/gorilla/websocket"
	"go.uber.org/zap"
)

// Connection WebSocket连接封装
type Connection struct {
	ID            string
	UserID        string
	SessionID     string
	Conn          *websocket.Conn
	Send          chan *Message
	Manager       *Manager
	Subscriptions map[string]bool // 订阅的频道
	LastPing      time.Time
	mu            sync.RWMutex
	channels      map[string]bool // 订阅的频道列表（兼容Broadcaster）
}

// GetSubscribedChannels 获取订阅的频道列表
func (c *Connection) GetSubscribedChannels() []string {
	c.mu.RLock()
	defer c.mu.RUnlock()

	channels := make([]string, 0, len(c.Subscriptions))
	for channel := range c.Subscriptions {
		channels = append(channels, channel)
	}
	return channels
}

// Subscribe 订阅频道
func (c *Connection) Subscribe(channel string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.Subscriptions == nil {
		c.Subscriptions = make(map[string]bool)
	}
	if c.channels == nil {
		c.channels = make(map[string]bool)
	}

	c.Subscriptions[channel] = true
	c.channels[channel] = true
}

// Unsubscribe 取消订阅频道
func (c *Connection) Unsubscribe(channel string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	delete(c.Subscriptions, channel)
	delete(c.channels, channel)
}

// Manager WebSocket连接管理器
type Manager struct {
	connections    map[string]*Connection // 连接ID -> 连接
	userConns      map[string][]string    // 用户ID -> 连接ID列表
	channels       map[string][]string    // 频道名 -> 连接ID列表
	register       chan *Connection
	unregister     chan *Connection
	broadcast      chan *BroadcastMessage
	businessEvents events.BusinessEventSubscriber // ✨ 业务事件订阅器
	mu             sync.RWMutex
	logger         *zap.Logger
}

// BroadcastMessage 广播消息
type BroadcastMessage struct {
	Channel string
	Message *Message
	Exclude []string // 排除的连接ID
}

// NewManager 创建新的连接管理器
func NewManager(logger *zap.Logger, businessEvents events.BusinessEventSubscriber) *Manager {
	manager := &Manager{
		connections:    make(map[string]*Connection),
		userConns:      make(map[string][]string),
		channels:       make(map[string][]string),
		register:       make(chan *Connection),
		unregister:     make(chan *Connection),
		broadcast:      make(chan *BroadcastMessage),
		businessEvents: businessEvents,
		logger:         logger,
	}

	// 启动业务事件监听
	if businessEvents != nil {
		go manager.startBusinessEventSubscription()
	}

	return manager
}

// startBusinessEventSubscription 启动业务事件订阅
func (m *Manager) startBusinessEventSubscription() {
	if m.businessEvents == nil {
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

	ctx := context.Background()
	eventChan, err := m.businessEvents.Subscribe(ctx, eventTypes)
	if err != nil {
		m.logger.Error("订阅业务事件失败", zap.Error(err))
		return
	}

	m.logger.Info("WebSocket 管理器已订阅业务事件")

	// 监听业务事件
	for {
		select {
		case event, ok := <-eventChan:
			if !ok {
				m.logger.Info("业务事件通道已关闭")
				return
			}
			m.handleBusinessEvent(event)
		}
	}
}

// handleBusinessEvent 处理业务事件
func (m *Manager) handleBusinessEvent(event *events.BusinessEvent) {
	// 将业务事件转换为WebSocket消息
	message := &Message{
		Type: MessageTypeOp,
		Data: map[string]interface{}{
			"type":      string(event.Type),
			"table_id":  event.TableID,
			"record_id": event.RecordID,
			"field_id":  event.FieldID,
			"data":      event.Data,
			"user_id":   event.UserID,
			"version":   event.Version,
			"timestamp": event.Timestamp,
		},
	}

	// 根据事件类型确定广播策略
	switch event.Type {
	case events.BusinessEventTypeRecordCreate,
		events.BusinessEventTypeRecordUpdate,
		events.BusinessEventTypeRecordDelete,
		events.BusinessEventTypeCalculationUpdate:
		// 记录相关事件：广播到表级别频道
		if event.TableID != "" {
			channel := fmt.Sprintf("table:%s", event.TableID)
			m.broadcast <- &BroadcastMessage{
				Channel: channel,
				Message: message,
			}
		}

		// 也广播到记录级别频道
		if event.RecordID != "" {
			channel := fmt.Sprintf("record:%s", event.RecordID)
			m.broadcast <- &BroadcastMessage{
				Channel: channel,
				Message: message,
			}
		}

	case events.BusinessEventTypeFieldCreate,
		events.BusinessEventTypeFieldUpdate,
		events.BusinessEventTypeFieldDelete:
		// 字段相关事件：广播到表级别频道
		if event.TableID != "" {
			channel := fmt.Sprintf("table:%s", event.TableID)
			m.broadcast <- &BroadcastMessage{
				Channel: channel,
				Message: message,
			}
		}

	case events.BusinessEventTypeTableCreate,
		events.BusinessEventTypeTableUpdate,
		events.BusinessEventTypeTableDelete:
		// 表相关事件：广播到全局频道
		m.broadcast <- &BroadcastMessage{
			Channel: "global",
			Message: message,
		}
	}

	m.logger.Debug("业务事件已转换为WebSocket消息",
		zap.String("event_type", string(event.Type)),
		zap.String("table_id", event.TableID),
		zap.String("record_id", event.RecordID))
}

// Run 启动管理器
func (m *Manager) Run(ctx context.Context) {
	ticker := time.NewTicker(30 * time.Second) // 心跳检查间隔
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case conn := <-m.register:
			m.registerConnection(conn)
		case conn := <-m.unregister:
			m.unregisterConnection(conn)
		case broadcast := <-m.broadcast:
			m.broadcastToChannel(broadcast)
		case <-ticker.C:
			m.checkHeartbeat()
		}
	}
}

// registerConnection 注册连接
func (m *Manager) registerConnection(conn *Connection) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.connections[conn.ID] = conn
	m.userConns[conn.UserID] = append(m.userConns[conn.UserID], conn.ID)

	m.logger.Info("WebSocket connection registered",
		zap.String("connection_id", conn.ID),
		zap.String("user_id", conn.UserID),
		zap.String("session_id", conn.SessionID),
	)
}

// unregisterConnection 注销连接
func (m *Manager) unregisterConnection(conn *Connection) {
	m.mu.Lock()
	defer m.mu.Unlock()

	// 从连接映射中删除
	delete(m.connections, conn.ID)

	// 从用户连接映射中删除
	if conns, exists := m.userConns[conn.UserID]; exists {
		for i, connID := range conns {
			if connID == conn.ID {
				m.userConns[conn.UserID] = append(conns[:i], conns[i+1:]...)
				break
			}
		}
		if len(m.userConns[conn.UserID]) == 0 {
			delete(m.userConns, conn.UserID)
		}
	}

	// 从所有频道中删除
	for channel := range conn.Subscriptions {
		m.removeFromChannel(channel, conn.ID)
	}

	// 关闭连接
	close(conn.Send)

	m.logger.Info("WebSocket connection unregistered",
		zap.String("connection_id", conn.ID),
		zap.String("user_id", conn.UserID),
	)
}

// broadcastToChannel 向频道广播消息
func (m *Manager) broadcastToChannel(broadcast *BroadcastMessage) {
	m.mu.RLock()
	connIDs, exists := m.channels[broadcast.Channel]
	m.mu.RUnlock()

	if !exists {
		return
	}

	excludeMap := make(map[string]bool)
	for _, id := range broadcast.Exclude {
		excludeMap[id] = true
	}

	for _, connID := range connIDs {
		if excludeMap[connID] {
			continue
		}

		m.mu.RLock()
		conn, exists := m.connections[connID]
		m.mu.RUnlock()

		if exists {
			select {
			case conn.Send <- broadcast.Message:
			default:
				// 发送失败，关闭连接
				m.unregister <- conn
			}
		}
	}
}

// Subscribe 订阅频道
func (m *Manager) Subscribe(connID, channel string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	conn, exists := m.connections[connID]
	if !exists {
		return
	}

	conn.mu.Lock()
	conn.Subscriptions[channel] = true
	conn.mu.Unlock()

	m.channels[channel] = append(m.channels[channel], connID)

	m.logger.Info("Connection subscribed to channel",
		zap.String("connection_id", connID),
		zap.String("channel", channel),
	)
}

// Unsubscribe 取消订阅频道
func (m *Manager) Unsubscribe(connID, channel string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	conn, exists := m.connections[connID]
	if !exists {
		return
	}

	conn.mu.Lock()
	delete(conn.Subscriptions, channel)
	conn.mu.Unlock()

	m.removeFromChannel(channel, connID)

	m.logger.Info("Connection unsubscribed from channel",
		zap.String("connection_id", connID),
		zap.String("channel", channel),
	)
}

// removeFromChannel 从频道中移除连接
func (m *Manager) removeFromChannel(channel, connID string) {
	if connIDs, exists := m.channels[channel]; exists {
		for i, id := range connIDs {
			if id == connID {
				m.channels[channel] = append(connIDs[:i], connIDs[i+1:]...)
				break
			}
		}
		if len(m.channels[channel]) == 0 {
			delete(m.channels, channel)
		}
	}
}

// checkHeartbeat 检查心跳
func (m *Manager) checkHeartbeat() {
	m.mu.RLock()
	connections := make([]*Connection, 0, len(m.connections))
	for _, conn := range m.connections {
		connections = append(connections, conn)
	}
	m.mu.RUnlock()

	now := time.Now()
	for _, conn := range connections {
		conn.mu.RLock()
		lastPing := conn.LastPing
		conn.mu.RUnlock()

		if now.Sub(lastPing) > 60*time.Second { // 60秒超时
			m.logger.Info("Connection heartbeat timeout, closing",
				zap.String("connection_id", conn.ID),
				zap.String("user_id", conn.UserID),
			)
			m.unregister <- conn
		}
	}
}

// GetConnection 获取连接
func (m *Manager) GetConnection(connID string) (*Connection, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	conn, exists := m.connections[connID]
	return conn, exists
}

// GetUserConnections 获取用户的所有连接
func (m *Manager) GetUserConnections(userID string) []*Connection {
	m.mu.RLock()
	defer m.mu.RUnlock()

	connIDs, exists := m.userConns[userID]
	if !exists {
		return nil
	}

	connections := make([]*Connection, 0, len(connIDs))
	for _, connID := range connIDs {
		if conn, exists := m.connections[connID]; exists {
			connections = append(connections, conn)
		}
	}

	return connections
}

// BroadcastToChannel 向频道广播消息
func (m *Manager) BroadcastToChannel(channel string, message *Message, exclude ...string) {
	m.broadcast <- &BroadcastMessage{
		Channel: channel,
		Message: message,
		Exclude: exclude,
	}
}

// GetClient 获取连接（用于Broadcaster）
func (m *Manager) GetClient(clientID string) *Connection {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.connections[clientID]
}

// AddChannelSubscriber 添加频道订阅者（用于Broadcaster）
func (m *Manager) AddChannelSubscriber(channel, clientID string) {
	m.Subscribe(clientID, channel)
}

// RemoveChannelSubscriber 移除频道订阅者（用于Broadcaster）
func (m *Manager) RemoveChannelSubscriber(channel, clientID string) {
	m.Unsubscribe(clientID, channel)
}

// BroadcastToUser 向用户的所有连接广播消息
func (m *Manager) BroadcastToUser(userID string, message *Message) {
	connections := m.GetUserConnections(userID)
	for _, conn := range connections {
		select {
		case conn.Send <- message:
		default:
			// 发送失败，关闭连接
			m.unregister <- conn
		}
	}
}

// GetStats 获取统计信息
func (m *Manager) GetStats() map[string]interface{} {
	m.mu.RLock()
	defer m.mu.RUnlock()

	return map[string]interface{}{
		"total_connections": len(m.connections),
		"total_users":       len(m.userConns),
		"total_channels":    len(m.channels),
	}
}
