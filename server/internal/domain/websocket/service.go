package websocket

import (
	"context"
	"fmt"
	"time"

	"go.uber.org/zap"

	"github.com/easyspace-ai/luckdb/server/internal/infrastructure/pubsub"
)

// Service WebSocket服务接口
type Service interface {
	// 连接管理
	Connect(ctx context.Context, userID, sessionID string) (*Connection, error)
	Disconnect(connID string) error

	// 频道管理
	Subscribe(connID, channel string) error
	Unsubscribe(connID, channel string) error

	// 消息广播
	BroadcastToChannel(channel string, message *Message, exclude ...string) error
	BroadcastToUser(userID string, message *Message) error

	// 文档操作
	PublishDocumentOp(collection, document string, op []interface{}) error
	PublishRecordOp(tableID, recordID string, op []interface{}) error
	PublishViewOp(tableID, viewID string, op []interface{}) error
	PublishFieldOp(tableID, fieldID string, op []interface{}) error

	// 在线状态
	UpdatePresence(userID, sessionID string, data map[string]interface{}) error
	GetPresence(collection string) ([]PresenceInfo, error)

	// 统计信息
	GetStats() map[string]interface{}
}

// service WebSocket服务实现
type service struct {
	manager     *Manager
	logger      *zap.Logger
	redisPubSub *pubsub.RedisPubSub
}

// NewService 创建WebSocket服务
func NewService(manager *Manager, logger *zap.Logger) Service {
	return &service{
		manager: manager,
		logger:  logger,
	}
}

// NewServiceWithRedis 创建带Redis集成的WebSocket服务
func NewServiceWithRedis(manager *Manager, redisPubSub *pubsub.RedisPubSub, logger *zap.Logger, prefix string) Service {
	// Note: Use DistributedBroadcaster instead of direct Redis integration
	return &service{
		manager:     manager,
		logger:      logger,
		redisPubSub: redisPubSub,
	}
}

// Connect 建立连接
func (s *service) Connect(ctx context.Context, userID, sessionID string) (*Connection, error) {
	// 这里应该验证用户身份
	// 暂时返回nil，实际连接由Handler处理
	return nil, nil
}

// Disconnect 断开连接
func (s *service) Disconnect(connID string) error {
	conn, exists := s.manager.GetConnection(connID)
	if !exists {
		return fmt.Errorf("connection not found: %s", connID)
	}

	s.manager.unregister <- conn
	return nil
}

// Subscribe 订阅频道
func (s *service) Subscribe(connID, channel string) error {
	s.manager.Subscribe(connID, channel)
	return nil
}

// Unsubscribe 取消订阅频道
func (s *service) Unsubscribe(connID, channel string) error {
	s.manager.Unsubscribe(connID, channel)
	return nil
}

// BroadcastToChannel 向频道广播消息
func (s *service) BroadcastToChannel(channel string, message *Message, exclude ...string) error {
	s.manager.BroadcastToChannel(channel, message, exclude...)
	return nil
}

// BroadcastToUser 向用户广播消息
func (s *service) BroadcastToUser(userID string, message *Message) error {
	s.manager.BroadcastToUser(userID, message)
	return nil
}

// PublishDocumentOp 发布文档操作
func (s *service) PublishDocumentOp(collection, document string, op []interface{}) error {
	message := NewMessage(MessageTypeOp, DocumentOperation{
		Op:     op,
		Source: "server",
	})
	message.Collection = collection
	message.Document = document

	// 直接广播到本地连接
	s.manager.BroadcastToChannel(collection, message)

	// 广播到文档频道
	if document != "" {
		docChannel := fmt.Sprintf("%s.%s", collection, document)
		s.manager.BroadcastToChannel(docChannel, message)
	}

	s.logger.Info("Document operation published",
		zap.String("collection", collection),
		zap.String("document", document),
		zap.Int("op_count", len(op)),
	)

	return nil
}

// PublishRecordOp 发布记录操作
func (s *service) PublishRecordOp(tableID, recordID string, op []interface{}) error {
	// 如果有Redis集成，直接通过Redis发布

	// ✅ 使用标准的 collection.document 格式
	// collection="table", document=tableID
	// 这样会广播到 "table" 和 "table.tbl_xxx" 两个channel
	return s.PublishDocumentOp("table", tableID, op)
}

// PublishViewOp 发布视图操作
func (s *service) PublishViewOp(tableID, viewID string, op []interface{}) error {
	// 如果有Redis集成，直接通过Redis发布

	collection := fmt.Sprintf("view_%s", tableID)
	return s.PublishDocumentOp(collection, viewID, op)
}

// PublishFieldOp 发布字段操作
func (s *service) PublishFieldOp(tableID, fieldID string, op []interface{}) error {
	// 如果有Redis集成，直接通过Redis发布

	collection := fmt.Sprintf("field_%s", tableID)
	return s.PublishDocumentOp(collection, fieldID, op)
}

// UpdatePresence 更新在线状态
func (s *service) UpdatePresence(userID, sessionID string, data map[string]interface{}) error {
	// 如果有Redis集成，通过Redis发布

	presence := PresenceInfo{
		UserID:    userID,
		SessionID: sessionID,
		Data:      data,
	}

	message := NewMessage(MessageTypePresence, presence)

	// 向用户的所有连接广播在线状态
	s.manager.BroadcastToUser(userID, message)

	s.logger.Info("Presence updated",
		zap.String("user_id", userID),
		zap.String("session_id", sessionID),
	)

	return nil
}

// GetPresence 获取在线状态
func (s *service) GetPresence(collection string) ([]PresenceInfo, error) {
	// 实现获取在线状态逻辑（参考 teable-develop 的 presence 机制）
	// 从 WebSocket 管理器获取指定 collection 的在线用户信息

	s.manager.mu.RLock()
	defer s.manager.mu.RUnlock()

	presenceList := make([]PresenceInfo, 0)

	// 从所有连接中提取用户信息
	for _, conn := range s.manager.connections {
		if conn.UserID != "" {
			presenceList = append(presenceList, PresenceInfo{
				UserID:   conn.UserID,
				LastSeen: time.Now(),
			})
		}
	}

	s.logger.Info("Get presence",
		zap.String("collection", collection),
		zap.Int("count", len(presenceList)),
	)

	return presenceList, nil
}

// GetStats 获取统计信息
func (s *service) GetStats() map[string]interface{} {
	return s.manager.GetStats()
}

// PublishTableMetaUpdate 发布表元数据更新
func (s *service) PublishTableMetaUpdate(tableID string) error {
	op := []interface{}{
		map[string]interface{}{
			"p": []interface{}{"lastModifiedTime"},
			"t": "date",
			"o": time.Now().Format(time.RFC3339),
		},
	}

	// 发布到表元数据频道
	collection := fmt.Sprintf("table_%s", tableID)
	return s.PublishDocumentOp(collection, "meta", op)
}

// PublishNotification 发布通知
func (s *service) PublishNotification(userID string, notification map[string]interface{}) error {
	message := NewMessage(MessageTypeOp, map[string]interface{}{
		"type": "notification",
		"data": notification,
	})

	return s.BroadcastToUser(userID, message)
}

// PublishSystemMessage 发布系统消息
func (s *service) PublishSystemMessage(message string, level string) error {
	// 如果有Redis集成，通过Redis发布

	systemMsg := NewMessage(MessageTypeOp, map[string]interface{}{
		"type":    "system",
		"message": message,
		"level":   level,
		"time":    time.Now().Format(time.RFC3339),
	})

	// 向所有连接广播系统消息
	s.manager.mu.RLock()
	connections := make([]*Connection, 0, len(s.manager.connections))
	for _, conn := range s.manager.connections {
		connections = append(connections, conn)
	}
	s.manager.mu.RUnlock()

	for _, conn := range connections {
		select {
		case conn.Send <- systemMsg:
		default:
			// 发送失败，关闭连接
			s.manager.unregister <- conn
		}
	}

	return nil
}

// PublishBulkOps 批量发布操作
func (s *service) PublishBulkOps(ops []BulkOperation) error {
	for _, op := range ops {
		switch op.Type {
		case "record":
			if err := s.PublishRecordOp(op.TableID, op.DocumentID, op.Operation); err != nil {
				s.logger.Error("Failed to publish record operation", zap.Error(err))
			}
		case "view":
			if err := s.PublishViewOp(op.TableID, op.DocumentID, op.Operation); err != nil {
				s.logger.Error("Failed to publish view operation", zap.Error(err))
			}
		case "field":
			if err := s.PublishFieldOp(op.TableID, op.DocumentID, op.Operation); err != nil {
				s.logger.Error("Failed to publish field operation", zap.Error(err))
			}
		default:
			s.logger.Warn("Unknown operation type", zap.String("type", op.Type))
		}
	}

	return nil
}

// BulkOperation 批量操作
type BulkOperation struct {
	Type       string        `json:"type"`
	TableID    string        `json:"table_id"`
	DocumentID string        `json:"document_id"`
	Operation  []interface{} `json:"operation"`
}
