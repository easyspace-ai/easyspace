package application

import (
	"context"
	"fmt"

	"github.com/easyspace-ai/luckdb/server/internal/domain/fields/entity"
	"github.com/easyspace-ai/luckdb/server/internal/domain/websocket"
	"github.com/easyspace-ai/luckdb/server/internal/events"
	"github.com/easyspace-ai/luckdb/server/pkg/logger"
)

// FieldBroadcasterImpl 字段广播器实现
type FieldBroadcasterImpl struct {
	wsService      websocket.Service
	businessEvents events.BusinessEventPublisher
}

// NewFieldBroadcaster 创建字段广播器
func NewFieldBroadcaster(wsService websocket.Service, businessEvents events.BusinessEventPublisher) *FieldBroadcasterImpl {
	return &FieldBroadcasterImpl{
		wsService:      wsService,
		businessEvents: businessEvents,
	}
}

// BroadcastFieldCreate 广播字段创建事件
func (b *FieldBroadcasterImpl) BroadcastFieldCreate(tableID string, field *entity.Field) {
	// 1. 发布到传统WebSocket广播器（保持向后兼容）
	if b.wsService != nil {
		// 创建字段创建操作
		operation := &websocket.Operation{
			Type:    websocket.OperationTypeFieldCreate,
			TableID: tableID,
			Data:    field,
		}

		// 创建 WebSocket 消息
		message := &websocket.Message{
			Type: websocket.MessageTypeOp,
			Data: operation,
		}

		// 广播到表级别频道
		channel := fmt.Sprintf("table:%s", tableID)
		if err := b.wsService.BroadcastToChannel(channel, message); err != nil {
			logger.Error("广播字段创建事件失败",
				logger.String("table_id", tableID),
				logger.String("field_id", field.ID().String()),
				logger.ErrorField(err),
			)
		} else {
			logger.Info("WebSocket 字段创建事件已广播",
				logger.String("table_id", tableID),
				logger.String("field_id", field.ID().String()),
			)
		}
	}

	// 2. 发布到统一业务事件系统（支持SSE、WebSocket、Yjs）
	if b.businessEvents != nil {
		ctx := context.Background()
		err := b.businessEvents.PublishFieldEvent(
			ctx,
			events.BusinessEventTypeFieldCreate,
			tableID,
			field.ID().String(),
			field,
			"", // 字段创建通常没有特定用户ID
		)

		if err != nil {
			logger.Error("发布字段创建业务事件失败",
				logger.String("table_id", tableID),
				logger.String("field_id", field.ID().String()),
				logger.ErrorField(err))
		} else {
			logger.Info("字段创建业务事件已发布",
				logger.String("table_id", tableID),
				logger.String("field_id", field.ID().String()))
		}
	}
}

// BroadcastFieldUpdate 广播字段更新事件
func (b *FieldBroadcasterImpl) BroadcastFieldUpdate(tableID string, field *entity.Field) {
	// 1. 发布到传统WebSocket广播器（保持向后兼容）
	if b.wsService != nil {
		// 创建字段更新操作
		operation := &websocket.Operation{
			Type:    websocket.OperationTypeFieldUpdate,
			TableID: tableID,
			Data:    field,
		}

		// 创建 WebSocket 消息
		message := &websocket.Message{
			Type: websocket.MessageTypeOp,
			Data: operation,
		}

		// 广播到表级别频道
		channel := fmt.Sprintf("table:%s", tableID)
		if err := b.wsService.BroadcastToChannel(channel, message); err != nil {
			logger.Error("广播字段更新事件失败",
				logger.String("table_id", tableID),
				logger.String("field_id", field.ID().String()),
				logger.ErrorField(err),
			)
		} else {
			logger.Info("WebSocket 字段更新事件已广播",
				logger.String("table_id", tableID),
				logger.String("field_id", field.ID().String()),
			)
		}
	}

	// 2. 发布到统一业务事件系统（支持SSE、WebSocket、Yjs）
	if b.businessEvents != nil {
		ctx := context.Background()
		err := b.businessEvents.PublishFieldEvent(
			ctx,
			events.BusinessEventTypeFieldUpdate,
			tableID,
			field.ID().String(),
			field,
			"", // 字段更新通常没有特定用户ID
		)

		if err != nil {
			logger.Error("发布字段更新业务事件失败",
				logger.String("table_id", tableID),
				logger.String("field_id", field.ID().String()),
				logger.ErrorField(err))
		} else {
			logger.Info("字段更新业务事件已发布",
				logger.String("table_id", tableID),
				logger.String("field_id", field.ID().String()))
		}
	}
}

// BroadcastFieldDelete 广播字段删除事件
func (b *FieldBroadcasterImpl) BroadcastFieldDelete(tableID, fieldID string) {
	// 1. 发布到传统WebSocket广播器（保持向后兼容）
	if b.wsService != nil {
		// 创建字段删除操作
		operation := &websocket.Operation{
			Type:    websocket.OperationTypeFieldDelete,
			TableID: tableID,
			Data: map[string]interface{}{
				"field_id": fieldID,
			},
		}

		// 创建 WebSocket 消息
		message := &websocket.Message{
			Type: websocket.MessageTypeOp,
			Data: operation,
		}

		// 广播到表级别频道
		channel := fmt.Sprintf("table:%s", tableID)
		if err := b.wsService.BroadcastToChannel(channel, message); err != nil {
			logger.Error("广播字段删除事件失败",
				logger.String("table_id", tableID),
				logger.String("field_id", fieldID),
				logger.ErrorField(err),
			)
		} else {
			logger.Info("WebSocket 字段删除事件已广播",
				logger.String("table_id", tableID),
				logger.String("field_id", fieldID),
			)
		}
	}

	// 2. 发布到统一业务事件系统（支持SSE、WebSocket、Yjs）
	if b.businessEvents != nil {
		ctx := context.Background()
		err := b.businessEvents.PublishFieldEvent(
			ctx,
			events.BusinessEventTypeFieldDelete,
			tableID,
			fieldID,
			map[string]interface{}{
				"field_id": fieldID,
			},
			"", // 字段删除通常没有特定用户ID
		)

		if err != nil {
			logger.Error("发布字段删除业务事件失败",
				logger.String("table_id", tableID),
				logger.String("field_id", fieldID),
				logger.ErrorField(err))
		} else {
			logger.Info("字段删除业务事件已发布",
				logger.String("table_id", tableID),
				logger.String("field_id", fieldID))
		}
	}
}
