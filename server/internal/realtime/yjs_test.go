package realtime

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/easyspace-ai/luckdb/server/internal/events"
	"github.com/stretchr/testify/assert"
	"go.uber.org/zap"
)

func TestNewYjsManager(t *testing.T) {
	logger := zap.NewNop()
	businessEvents := &MockBusinessEventSubscriber{}

	manager := NewYjsManager(logger, businessEvents)

	assert.NotNil(t, manager)
	assert.Equal(t, logger, manager.logger)
	assert.Equal(t, businessEvents, manager.businessEvents)
	assert.NotNil(t, manager.documents)
	assert.NotNil(t, manager.connections)
	assert.NotNil(t, manager.persistence)
	assert.NotNil(t, manager.awareness)
	assert.NotNil(t, manager.wsUpgrader)
	assert.NotNil(t, manager.ctx)
	assert.NotNil(t, manager.cancel)
}

func TestYjsManager_GetStats(t *testing.T) {
	manager := createTestYjsManager()

	stats := manager.GetStats()

	assert.NotNil(t, stats)
	assert.Contains(t, stats, "documents")
	assert.Contains(t, stats, "connections")
	assert.Contains(t, stats, "active_connections")
	assert.Contains(t, stats, "active_sessions")
	assert.Contains(t, stats, "active_users")
	assert.Contains(t, stats, "timestamp")
}

func TestYjsManager_Shutdown(t *testing.T) {
	manager := createTestYjsManager()

	// 测试正常关闭
	manager.Shutdown()

	// 验证上下文已取消
	select {
	case <-manager.ctx.Done():
		// 正常情况
	default:
		t.Error("Context should be cancelled after shutdown")
	}
}

func TestYjsManager_GetOrCreateDocument(t *testing.T) {
	manager := createTestYjsManager()
	documentID := "test-document-id"

	// 第一次获取，应该创建新文档
	document1 := manager.getOrCreateDocument(documentID)
	assert.NotNil(t, document1)
	assert.Equal(t, documentID, document1.ID)
	assert.NotNil(t, document1.Doc)
	assert.NotNil(t, document1.Sessions)

	// 第二次获取，应该返回同一个文档
	document2 := manager.getOrCreateDocument(documentID)
	assert.Equal(t, document1, document2)
}

func TestYjsManager_RegisterConnection(t *testing.T) {
	manager := createTestYjsManager()
	connection := createTestConnection()

	manager.registerConnection(connection)

	assert.Contains(t, manager.connections, connection.ID)
	assert.Equal(t, connection, manager.connections[connection.ID])
}

func TestYjsManager_UnregisterConnection(t *testing.T) {
	manager := createTestYjsManager()
	connection := createTestConnection()

	manager.registerConnection(connection)
	assert.Contains(t, manager.connections, connection.ID)

	manager.unregisterConnection(connection)
	assert.NotContains(t, manager.connections, connection.ID)
}

func TestYjsManager_RegisterSession(t *testing.T) {
	manager := createTestYjsManager()
	document := manager.getOrCreateDocument("test-doc")
	session := createTestSession()

	manager.registerSession(document, session)

	assert.Contains(t, document.Sessions, session.ID)
	assert.Equal(t, session, document.Sessions[session.ID])
}

func TestYjsManager_UnregisterSession(t *testing.T) {
	manager := createTestYjsManager()
	document := manager.getOrCreateDocument("test-doc")
	session := createTestSession()

	manager.registerSession(document, session)
	assert.Contains(t, document.Sessions, session.ID)

	manager.unregisterSession(document, session)
	assert.NotContains(t, document.Sessions, session.ID)
}

func TestYjsManager_HandleBusinessEvent(t *testing.T) {
	manager := createTestYjsManager()

	// 测试记录创建事件
	event := &events.BusinessEvent{
		ID:        "test-event-id",
		Type:      events.BusinessEventTypeRecordCreate,
		TableID:   "test-table-id",
		RecordID:  "test-record-id",
		UserID:    "test-user-id",
		Timestamp: time.Now().Unix(),
		Version:   1,
	}

	// 应该不会出错
	manager.handleBusinessEvent(event)
}

func TestYjsManager_UpdateDocumentFromBusinessEvent(t *testing.T) {
	manager := createTestYjsManager()
	documentID := "test-document-id"
	event := &events.BusinessEvent{
		ID:        "test-event-id",
		Type:      events.BusinessEventTypeRecordCreate,
		TableID:   "test-table-id",
		RecordID:  "test-record-id",
		UserID:    "test-user-id",
		Timestamp: time.Now().Unix(),
		Version:   1,
	}

	manager.updateDocumentFromBusinessEvent(documentID, event)

	// 验证文档已创建
	assert.Contains(t, manager.documents, documentID)
	document := manager.documents[documentID]
	assert.NotNil(t, document)
	assert.Equal(t, documentID, document.ID)
}

// MockBusinessEventSubscriber 模拟业务事件订阅器
type MockBusinessEventSubscriber struct{}

func (m *MockBusinessEventSubscriber) Subscribe(ctx context.Context, eventTypes []events.BusinessEventType) (<-chan *events.BusinessEvent, error) {
	ch := make(chan *events.BusinessEvent, 1)
	return ch, nil
}

func (m *MockBusinessEventSubscriber) Unsubscribe(subscriptionID string) error {
	return nil
}

func (m *MockBusinessEventSubscriber) Publish(event *events.BusinessEvent) error {
	return nil
}

// 辅助函数
func createTestYjsManager() *YjsManager {
	logger := zap.NewNop()
	businessEvents := &MockBusinessEventSubscriber{}
	return NewYjsManager(logger, businessEvents)
}

func createTestConnection() *YjsConnection {
	return &YjsConnection{
		ID:       "test-connection-id",
		UserID:   "test-user-id",
		Conn:     nil, // 在实际测试中可能需要真实的 WebSocket 连接
		Sessions: make(map[string]*YjsSession),
		LastSeen: time.Now(),
		IsActive: true,
	}
}

func createTestSession() *YjsSession {
	return &YjsSession{
		ID:         "test-session-id",
		DocumentID: "test-document-id",
		UserID:     "test-user-id",
		Conn:       nil, // 在实际测试中可能需要真实的 WebSocket 连接
		LastSeen:   time.Now(),
		IsActive:   true,
	}
}

// TestConvertJSONToBytes 测试 JSON 到字节数组的转换
func TestConvertJSONToBytes(t *testing.T) {
	tests := []struct {
		name     string
		input    json.RawMessage
		expected []byte
		hasError bool
	}{
		{
			name:     "空数据",
			input:    json.RawMessage(`null`),
			expected: nil,
			hasError: false,
		},
		{
			name:     "数组格式",
			input:    json.RawMessage(`[1,2,3,4,5]`),
			expected: []byte{1, 2, 3, 4, 5},
			hasError: false,
		},
		{
			name:     "对象格式",
			input:    json.RawMessage(`{"0":1,"1":2,"2":3,"3":4,"4":5}`),
			expected: []byte{1, 2, 3, 4, 5},
			hasError: false,
		},
		{
			name:     "无效 JSON",
			input:    json.RawMessage(`invalid json`),
			expected: nil,
			hasError: true,
		},
		{
			name:     "非数字值",
			input:    json.RawMessage(`{"0":"invalid","1":2}`),
			expected: nil,
			hasError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := convertJSONToBytes(tt.input)

			if tt.hasError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tt.expected, result)
			}
		})
	}
}

// TestYjsMessageParsing 测试 YjsMessage 的 JSON 解析
func TestYjsMessageParsing(t *testing.T) {
	tests := []struct {
		name     string
		jsonData string
		hasError bool
	}{
		{
			name:     "包含数组格式的 update",
			jsonData: `{"type":"update","document":"test-doc","update":[1,2,3,4,5]}`,
			hasError: false,
		},
		{
			name:     "包含对象格式的 state",
			jsonData: `{"type":"sync","document":"test-doc","state":{"0":1,"1":2,"2":3}}`,
			hasError: false,
		},
		{
			name:     "包含数组格式的 state",
			jsonData: `{"type":"sync","document":"test-doc","state":[1,2,3]}`,
			hasError: false,
		},
		{
			name:     "无效的 JSON",
			jsonData: `{"type":"update","document":"test-doc","update":invalid}`,
			hasError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var msg YjsMessage
			err := json.Unmarshal([]byte(tt.jsonData), &msg)

			if tt.hasError {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, msg)
			}
		})
	}
}
