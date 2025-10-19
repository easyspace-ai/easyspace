package http

import (
	"github.com/gin-gonic/gin"

	"github.com/easyspace-ai/luckdb/server/internal/application"
	wsService "github.com/easyspace-ai/luckdb/server/internal/domain/websocket"
	"github.com/easyspace-ai/luckdb/server/pkg/logger"
)

// WebSocketHandler WebSocket HTTP处理器
type WebSocketHandler struct {
	handler     *wsService.Handler
	authService *application.AuthService
}

// NewWebSocketHandler 创建WebSocket处理器
func NewWebSocketHandler(manager *wsService.Manager, authService *application.AuthService) *WebSocketHandler {
	return &WebSocketHandler{
		handler:     wsService.NewHandler(manager, logger.Logger),
		authService: authService,
	}
}

// HandleWebSocket 处理WebSocket连接
func (h *WebSocketHandler) HandleWebSocket(c *gin.Context) {
	// 1. 从查询参数中获取token
	token := c.Query("token")
	if token == "" {
		// 尝试从Authorization header获取
		token = c.GetHeader("Authorization")
		if len(token) > 7 && token[:7] == "Bearer " {
			token = token[7:]
		}
	}

	// 2. 验证token并获取用户ID
	if token != "" {
		claims, err := h.authService.ValidateToken(c.Request.Context(), token)
		if err != nil {
			logger.Warn("WebSocket token验证失败", logger.ErrorField(err))
			c.JSON(401, gin.H{"error": "invalid token"})
			return
		}

		// ✅ 将用户信息设置到 gin context 和 header 中，供 domain Handler 使用
		c.Set("user_id", claims.UserID)
		c.Request.Header.Set("X-User-ID", claims.UserID)

		logger.Info("WebSocket token验证成功",
			logger.String("user_id", claims.UserID))
	}

	// 3. 委托给 domain 层的 Handler 处理
	h.handler.HandleWebSocket(c)
}
