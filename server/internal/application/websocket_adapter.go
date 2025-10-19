package application

import (
	"fmt"

	wsService "github.com/easyspace-ai/luckdb/server/internal/domain/websocket"
	"github.com/easyspace-ai/luckdb/server/pkg/logger"
)

// WebSocketService WebSocket 服务接口
type WebSocketService interface {
	PublishRecordOp(tableID, recordID string, operations []interface{}) error
}

// WebSocketServiceAdapter WebSocket 服务适配器
// 将 domain/websocket.Service 适配为 application.WebSocketService 接口
type WebSocketServiceAdapter struct {
	wsService wsService.Service
}

// NewWebSocketServiceAdapter 创建 WebSocket 服务适配器
func NewWebSocketServiceAdapter(ws wsService.Service) *WebSocketServiceAdapter {
	return &WebSocketServiceAdapter{
		wsService: ws,
	}
}

// PublishRecordOp 推送记录操作
func (a *WebSocketServiceAdapter) PublishRecordOp(tableID, recordID string, operations []interface{}) error {
	if a.wsService == nil {
		logger.Warn("WebSocket 服务未初始化")
		return nil // 不阻塞主流程
	}

	// 调用底层 WebSocket 服务
	if err := a.wsService.PublishRecordOp(tableID, recordID, operations); err != nil {
		return fmt.Errorf("推送记录操作失败: %w", err)
	}

	return nil
}

// 确保实现了接口
var _ WebSocketService = (*WebSocketServiceAdapter)(nil)
