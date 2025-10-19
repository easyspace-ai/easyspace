package websocket

import (
	"context"
	"sync"

	"go.uber.org/zap"
)

// Broadcaster 操作广播器
// 负责将操作消息广播到订阅的客户端
type Broadcaster struct {
	manager        *Manager
	channelManager *ChannelManager
	logger         *zap.Logger
	mu             sync.RWMutex
}

// NewBroadcaster 创建广播器
func NewBroadcaster(manager *Manager, logger *zap.Logger) *Broadcaster {
	return &Broadcaster{
		manager:        manager,
		channelManager: NewChannelManager(),
		logger:         logger,
	}
}

// BroadcastOperation 广播操作到所有相关频道
// 参考 teable-develop 的广播逻辑
func (b *Broadcaster) BroadcastOperation(ctx context.Context, operation *Operation) error {
	// 获取操作应该广播到的所有频道
	channels := b.channelManager.GetOperationChannels(operation)

	if len(channels) == 0 {
		b.logger.Warn("No channels found for operation",
			zap.String("operation_type", string(operation.Type)),
			zap.String("table_id", operation.TableID),
		)
		return nil
	}

	// 创建 WebSocket 消息
	message := NewMessage(MessageTypeOp, operation)

	// 广播到所有频道
	for _, channel := range channels {
		// 获取订阅该频道的所有客户端
		b.manager.BroadcastToChannel(channel, message)

		b.logger.Debug("Broadcasted operation to channel",
			zap.String("channel", channel),
			zap.String("operation_type", string(operation.Type)),
			zap.String("table_id", operation.TableID),
		)
	}

	b.logger.Info("Operation broadcasted successfully",
		zap.String("operation_type", string(operation.Type)),
		zap.String("table_id", operation.TableID),
		zap.Int("channels_count", len(channels)),
		zap.Strings("channels", channels),
	)

	return nil
}

// BroadcastRecordCreate 广播记录创建操作
func (b *Broadcaster) BroadcastRecordCreate(ctx context.Context, tableID, recordID string, fields map[string]interface{}, userID, windowID string) error {
	operation := NewRecordCreateOperation(tableID, recordID, fields).
		WithUserID(userID).
		WithWindowID(windowID)

	return b.BroadcastOperation(ctx, operation)
}

// BroadcastRecordUpdate 广播记录更新操作
func (b *Broadcaster) BroadcastRecordUpdate(ctx context.Context, tableID, recordID string, fields map[string]interface{}, userID, windowID string) error {
	operation := NewRecordUpdateOperation(tableID, recordID, fields).
		WithUserID(userID).
		WithWindowID(windowID)

	return b.BroadcastOperation(ctx, operation)
}

// BroadcastRecordDelete 广播记录删除操作
func (b *Broadcaster) BroadcastRecordDelete(ctx context.Context, tableID, recordID string, userID, windowID string) error {
	operation := NewRecordDeleteOperation(tableID, recordID).
		WithUserID(userID).
		WithWindowID(windowID)

	return b.BroadcastOperation(ctx, operation)
}

// BroadcastBatchUpdate 广播批量更新操作
func (b *Broadcaster) BroadcastBatchUpdate(ctx context.Context, tableID string, records []RecordUpdateOp, userID, windowID string) error {
	operation := NewBatchRecordUpdateOperation(tableID, records).
		WithUserID(userID).
		WithWindowID(windowID)

	return b.BroadcastOperation(ctx, operation)
}

// BroadcastFieldCreate 广播字段创建操作
func (b *Broadcaster) BroadcastFieldCreate(ctx context.Context, tableID string, field interface{}, userID, windowID string) error {
	operation := &Operation{
		Type:     OperationTypeFieldCreate,
		TableID:  tableID,
		Data:     field,
		UserID:   userID,
		WindowID: windowID,
	}

	return b.BroadcastOperation(ctx, operation)
}

// BroadcastFieldUpdate 广播字段更新操作
func (b *Broadcaster) BroadcastFieldUpdate(ctx context.Context, tableID string, field interface{}, userID, windowID string) error {
	operation := &Operation{
		Type:     OperationTypeFieldUpdate,
		TableID:  tableID,
		Data:     field,
		UserID:   userID,
		WindowID: windowID,
	}

	return b.BroadcastOperation(ctx, operation)
}

// BroadcastFieldDelete 广播字段删除操作
func (b *Broadcaster) BroadcastFieldDelete(ctx context.Context, tableID, fieldID string, userID, windowID string) error {
	operation := NewFieldDeleteOperation(tableID, fieldID).
		WithUserID(userID).
		WithWindowID(windowID)

	return b.BroadcastOperation(ctx, operation)
}

// BroadcastToTable 广播消息到表级别频道
// 用于广播表级别的变更
func (b *Broadcaster) BroadcastToTable(ctx context.Context, tableID string, message *Message) error {
	channel := b.channelManager.GetTableChannel(tableID)
	b.manager.BroadcastToChannel(channel, message)
	return nil
}

// BroadcastToRecord 广播消息到记录级别频道
func (b *Broadcaster) BroadcastToRecord(ctx context.Context, tableID, recordID string, message *Message) error {
	channel := b.channelManager.GetRecordChannel(tableID, recordID)
	b.manager.BroadcastToChannel(channel, message)
	return nil
}

// BroadcastToField 广播消息到字段级别频道
func (b *Broadcaster) BroadcastToField(ctx context.Context, tableID, fieldID string, message *Message) error {
	channel := b.channelManager.GetFieldChannel(tableID, fieldID)
	b.manager.BroadcastToChannel(channel, message)
	return nil
}

// BroadcastToUser 广播消息到用户频道
func (b *Broadcaster) BroadcastToUser(ctx context.Context, userID string, message *Message) error {
	channel := b.channelManager.GetUserChannel(userID)
	b.manager.BroadcastToChannel(channel, message)
	return nil
}

// GetChannelManager 获取频道管理器
func (b *Broadcaster) GetChannelManager() *ChannelManager {
	return b.channelManager
}

// GetSubscribedChannels 获取客户端订阅的频道列表
func (b *Broadcaster) GetSubscribedChannels(clientID string) []string {
	client := b.manager.GetClient(clientID)
	if client == nil {
		return []string{}
	}
	return client.GetSubscribedChannels()
}

// SubscribeToTable 订阅表频道
func (b *Broadcaster) SubscribeToTable(clientID, tableID string) error {
	channel := b.channelManager.GetTableChannel(tableID)

	// 1. 获取客户端
	client := b.manager.GetClient(clientID)
	if client == nil {
		return &SubscriptionError{Message: "client not found"}
	}

	// 2. 验证权限（TODO: 集成PermissionService）
	if !b.channelManager.ValidateChannelAccess(client.UserID, channel) {
		return &SubscriptionError{Message: "access denied"}
	}

	// 3. 添加到客户端的订阅列表
	client.Subscribe(channel)

	// 4. 通知Manager添加到频道订阅者映射
	b.manager.AddChannelSubscriber(channel, clientID)

	b.logger.Info("Client subscribed to table",
		zap.String("client_id", clientID),
		zap.String("table_id", tableID),
		zap.String("channel", channel),
		zap.String("user_id", client.UserID),
	)
	return nil
}

// UnsubscribeFromTable 取消订阅表频道
func (b *Broadcaster) UnsubscribeFromTable(clientID, tableID string) error {
	channel := b.channelManager.GetTableChannel(tableID)

	// 1. 获取客户端
	client := b.manager.GetClient(clientID)
	if client == nil {
		return &SubscriptionError{Message: "client not found"}
	}

	// 2. 从客户端的订阅列表中移除
	client.Unsubscribe(channel)

	// 3. 从频道订阅者映射中移除
	b.manager.RemoveChannelSubscriber(channel, clientID)

	b.logger.Info("Client unsubscribed from table",
		zap.String("client_id", clientID),
		zap.String("table_id", tableID),
		zap.String("channel", channel),
	)
	return nil
}

// SubscribeToRecord 订阅记录频道
func (b *Broadcaster) SubscribeToRecord(clientID, tableID, recordID string) error {
	channel := b.channelManager.GetRecordChannel(tableID, recordID)

	// 1. 获取客户端
	client := b.manager.GetClient(clientID)
	if client == nil {
		return &SubscriptionError{Message: "client not found"}
	}

	// 2. 验证权限（TODO: 集成PermissionService）
	if !b.channelManager.ValidateChannelAccess(client.UserID, channel) {
		return &SubscriptionError{Message: "access denied"}
	}

	// 3. 添加到客户端的订阅列表
	client.Subscribe(channel)

	// 4. 通知Manager添加到频道订阅者映射
	b.manager.AddChannelSubscriber(channel, clientID)

	b.logger.Info("Client subscribed to record",
		zap.String("client_id", clientID),
		zap.String("table_id", tableID),
		zap.String("record_id", recordID),
		zap.String("channel", channel),
		zap.String("user_id", client.UserID),
	)
	return nil
}

// UnsubscribeFromRecord 取消订阅记录频道
func (b *Broadcaster) UnsubscribeFromRecord(clientID, tableID, recordID string) error {
	channel := b.channelManager.GetRecordChannel(tableID, recordID)

	// 1. 获取客户端
	client := b.manager.GetClient(clientID)
	if client == nil {
		return &SubscriptionError{Message: "client not found"}
	}

	// 2. 从客户端的订阅列表中移除
	client.Unsubscribe(channel)

	// 3. 从频道订阅者映射中移除
	b.manager.RemoveChannelSubscriber(channel, clientID)

	b.logger.Info("Client unsubscribed from record",
		zap.String("client_id", clientID),
		zap.String("table_id", tableID),
		zap.String("record_id", recordID),
		zap.String("channel", channel),
	)
	return nil
}

// SubscriptionError 订阅错误
type SubscriptionError struct {
	Message string
}

func (e *SubscriptionError) Error() string {
	return e.Message
}
