package application

import (
	"fmt"

	"github.com/easyspace-ai/luckdb/server/internal/domain/websocket"
	"github.com/easyspace-ai/luckdb/server/pkg/logger"
)

// RecordBroadcasterImpl 记录广播器实现
type RecordBroadcasterImpl struct {
	wsService websocket.Service
}

// NewRecordBroadcaster 创建新的记录广播器
func NewRecordBroadcaster(wsService websocket.Service) *RecordBroadcasterImpl {
	return &RecordBroadcasterImpl{
		wsService: wsService,
	}
}

// BroadcastRecordCreate 广播记录创建操作
func (b *RecordBroadcasterImpl) BroadcastRecordCreate(tableID, recordID string, fields map[string]interface{}) {
	operation := &websocket.Operation{
		Type:    websocket.OperationTypeRecordCreate,
		TableID: tableID,
		Data: map[string]interface{}{
			"record_id": recordID,
			"fields":    fields,
		},
	}

	message := &websocket.Message{
		Type: websocket.MessageTypeOp,
		Data: operation,
	}

	channel := fmt.Sprintf("table:%s", tableID)
	if err := b.wsService.BroadcastToChannel(channel, message); err != nil {
		logger.Error("Failed to broadcast record create event",
			logger.String("table_id", tableID),
			logger.String("record_id", recordID),
			logger.ErrorField(err))
	}
}

// BroadcastRecordUpdate 广播记录更新操作
func (b *RecordBroadcasterImpl) BroadcastRecordUpdate(tableID, recordID string, fields map[string]interface{}) {
	operation := &websocket.Operation{
		Type:    websocket.OperationTypeRecordUpdate,
		TableID: tableID,
		Data: map[string]interface{}{
			"record_id": recordID,
			"fields":    fields,
		},
	}

	message := &websocket.Message{
		Type: websocket.MessageTypeOp,
		Data: operation,
	}

	channel := fmt.Sprintf("table:%s", tableID)
	if err := b.wsService.BroadcastToChannel(channel, message); err != nil {
		logger.Error("Failed to broadcast record update event",
			logger.String("table_id", tableID),
			logger.String("record_id", recordID),
			logger.ErrorField(err))
	}
}

// BroadcastRecordDelete 广播记录删除操作
func (b *RecordBroadcasterImpl) BroadcastRecordDelete(tableID, recordID string) {
	operation := &websocket.Operation{
		Type:    websocket.OperationTypeRecordDelete,
		TableID: tableID,
		Data: map[string]interface{}{
			"record_id": recordID,
		},
	}

	message := &websocket.Message{
		Type: websocket.MessageTypeOp,
		Data: operation,
	}

	channel := fmt.Sprintf("table:%s", tableID)
	if err := b.wsService.BroadcastToChannel(channel, message); err != nil {
		logger.Error("Failed to broadcast record delete event",
			logger.String("table_id", tableID),
			logger.String("record_id", recordID),
			logger.ErrorField(err))
	}
}
