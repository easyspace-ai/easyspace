package realtime

import (
	"context"
	"fmt"
	"net/http"
	"sync"

	"github.com/easyspace-ai/luckdb/server/internal/events"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// Manager 实时通信管理器
// 集成 Yjs 协作和 SSE 数据同步
type Manager struct {
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

// NewManager 创建实时通信管理器
func NewManager(logger *zap.Logger) *Manager {
	ctx, cancel := context.WithCancel(context.Background())

	// 创建业务事件管理器
	businessEventManager := events.NewBusinessEventManager(logger)

	manager := &Manager{
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

// SetBusinessEventManager 设置业务事件管理器
func (m *Manager) SetBusinessEventManager(businessEventManager *events.BusinessEventManager) {
	m.mu.Lock()
	defer m.mu.Unlock()

	// 关闭旧的业务事件管理器
	if m.businessEventManager != nil {
		// 停止旧的 YJS 和 SSE 管理器
		if m.yjsManager != nil {
			m.yjsManager.Shutdown()
		}
		if m.sseManager != nil {
			m.sseManager.Shutdown()
		}
	}

	// 设置新的业务事件管理器
	m.businessEventManager = businessEventManager

	// 重新初始化 YJS 和 SSE 管理器
	m.yjsManager = NewYjsManager(m.logger, businessEventManager)
	m.sseManager = NewSSEManager(m.logger, businessEventManager)

	m.logger.Info("✅ 实时管理器业务事件管理器已更新")
}

// GetStats 获取统计信息
func (m *Manager) GetStats() map[string]interface{} {
	m.mu.RLock()
	defer m.mu.RUnlock()

	stats := map[string]interface{}{}

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
