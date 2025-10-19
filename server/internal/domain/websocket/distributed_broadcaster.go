package websocket

import (
	"context"

	"github.com/easyspace-ai/luckdb/server/internal/infrastructure/pubsub"

	"go.uber.org/zap"
)

// DistributedBroadcaster 分布式广播器
// 使用Redis Pub/Sub实现跨服务实例的消息广播
type DistributedBroadcaster struct {
	localBroadcaster *Broadcaster
	pubsub           *pubsub.RedisPubSub
	logger           *zap.Logger
}

// NewDistributedBroadcaster 创建分布式广播器
func NewDistributedBroadcaster(
	localBroadcaster *Broadcaster,
	redisPubSub *pubsub.RedisPubSub,
	logger *zap.Logger,
) *DistributedBroadcaster {
	db := &DistributedBroadcaster{
		localBroadcaster: localBroadcaster,
		pubsub:           redisPubSub,
		logger:           logger,
	}

	// 订阅所有WebSocket相关的消息
	// 使用模式订阅: table:*, record:*, field:*, view:*
	if redisPubSub != nil {
		patterns := []string{"table:*", "record:*", "field:*", "view:*", "user:*"}
		for _, pattern := range patterns {
			if err := redisPubSub.SubscribeToAllUpdates(pattern, db.handleDistributedMessage); err != nil {
				logger.Error("Failed to subscribe to pattern",
					zap.String("pattern", pattern),
					zap.Error(err),
				)
			}
		}
	}

	return db
}

// BroadcastOperation 广播操作（分布式版本）
// 1. 先通过Redis Pub/Sub广播到所有服务实例
// 2. 每个实例收到消息后，在本地广播给WebSocket客户端
func (db *DistributedBroadcaster) BroadcastOperation(ctx context.Context, operation *Operation) error {
	// 获取操作应该广播到的所有频道
	channels := db.localBroadcaster.channelManager.GetOperationChannels(operation)

	// 通过Redis发布消息到所有实例
	if db.pubsub != nil {
		for _, channel := range channels {
			if err := db.pubsub.Publish(ctx, channel, string(operation.Type), operation); err != nil {
				db.logger.Error("Failed to publish to Redis",
					zap.String("channel", channel),
					zap.Error(err),
				)
				// 继续处理，不因Redis错误而中断
			}
		}
	} else {
		// 如果没有Redis，回退到本地广播
		return db.localBroadcaster.BroadcastOperation(ctx, operation)
	}

	return nil
}

// handleDistributedMessage 处理从Redis收到的分布式消息
// 这个方法在接收到其他服务实例的广播时被调用
func (db *DistributedBroadcaster) handleDistributedMessage(msg *pubsub.Message) error {
	db.logger.Debug("Received distributed message",
		zap.String("channel", msg.Channel),
		zap.String("type", msg.Type),
	)

	// 将消息转换为Operation
	operation, ok := msg.Data.(*Operation)
	if !ok {
		db.logger.Warn("Invalid operation data in distributed message",
			zap.String("channel", msg.Channel),
		)
		return nil
	}

	// 在本地广播给WebSocket客户端
	// 注意：不要再次发布到Redis，避免消息循环
	wsMessage := NewMessage(MessageTypeOp, operation)
	db.localBroadcaster.manager.BroadcastToChannel(msg.Channel, wsMessage)

	return nil
}

// BroadcastRecordCreate 广播记录创建（分布式版本）
func (db *DistributedBroadcaster) BroadcastRecordCreate(ctx context.Context, tableID, recordID string, fields map[string]interface{}, userID, windowID string) error {
	operation := NewRecordCreateOperation(tableID, recordID, fields).
		WithUserID(userID).
		WithWindowID(windowID)

	return db.BroadcastOperation(ctx, operation)
}

// BroadcastRecordUpdate 广播记录更新（分布式版本）
func (db *DistributedBroadcaster) BroadcastRecordUpdate(ctx context.Context, tableID, recordID string, fields map[string]interface{}, userID, windowID string) error {
	operation := NewRecordUpdateOperation(tableID, recordID, fields).
		WithUserID(userID).
		WithWindowID(windowID)

	return db.BroadcastOperation(ctx, operation)
}

// BroadcastRecordDelete 广播记录删除（分布式版本）
func (db *DistributedBroadcaster) BroadcastRecordDelete(ctx context.Context, tableID, recordID string, userID, windowID string) error {
	operation := NewRecordDeleteOperation(tableID, recordID).
		WithUserID(userID).
		WithWindowID(windowID)

	return db.BroadcastOperation(ctx, operation)
}

// Close 关闭分布式广播器
func (db *DistributedBroadcaster) Close() error {
	if db.pubsub != nil {
		return db.pubsub.Close()
	}
	return nil
}
