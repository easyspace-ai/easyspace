# ShareDB 到 Yjs + SSE 迁移指南

## 🎯 概述

本指南将帮助您从 ShareDB 迁移到我们新的 Yjs + SSE 实时协作系统。新系统提供了更好的性能、更简单的冲突解决和更强的离线支持。

## 📊 系统对比

| 特性 | ShareDB | Yjs + SSE |
|------|---------|-----------|
| 协作算法 | Operational Transform (OT) | Conflict-free Replicated Data Types (CRDT) |
| 冲突解决 | 服务器端复杂逻辑 | 客户端自动解决 |
| 离线支持 | 有限 | 完整支持 |
| 性能 | 中等 | 高性能 |
| 复杂度 | 高 | 低 |
| 数据同步 | WebSocket | WebSocket + SSE |

## 🚀 迁移步骤

### 1. 后端迁移

#### 1.1 替换实时通信管理器

**旧代码 (ShareDB):**
```go
// 使用 ShareDB
import "github.com/gin-gonic/gin"

func setupShareDB(r *gin.Engine) {
    // ShareDB 设置
    r.GET("/sharedb", handleShareDB)
}
```

**新代码 (Yjs + SSE):**
```go
// 使用新的实时通信管理器
import "github.com/easyspace-ai/luckdb/server/internal/realtime"

func setupRealtime(r *gin.Engine) {
    realtimeManager := realtime.NewManager(logger)
    
    // Yjs 协作 WebSocket
    r.GET("/yjs/ws", realtimeManager.HandleYjsWebSocket)
    
    // SSE 数据同步
    r.GET("/api/realtime", realtimeManager.HandleSSE)
    r.POST("/api/realtime", realtimeManager.HandleSSESubscription)
}
```

#### 1.2 替换数据广播

**旧代码 (ShareDB):**
```go
// ShareDB 数据广播
func broadcastRecordChange(record interface{}) {
    // ShareDB 的 op 事件
    doc.SubmitOp(op)
}
```

**新代码 (Yjs + SSE):**
```go
// 新的数据广播
func broadcastRecordChange(record interface{}) {
    // 通过 SSE 广播
    realtimeManager.BroadcastRecordCreate(record)
    realtimeManager.BroadcastRecordUpdate(record)
    realtimeManager.BroadcastRecordDelete(record)
}
```

### 2. 前端迁移

#### 2.1 替换协作编辑

**旧代码 (ShareDB):**
```javascript
// ShareDB 协作编辑
import ShareDB from 'sharedb/lib/client';

const connection = new ShareDB.Connection(websocket);
const doc = connection.get('documents', 'doc1');

doc.subscribe((err) => {
    if (err) throw err;
    
    // 监听变化
    doc.on('op', (op, source) => {
        console.log('Document changed:', op);
    });
    
    // 提交操作
    doc.submitOp([{p: ['content'], t: 'text0', o: 'Hello'}]);
});
```

**新代码 (Yjs):**
```javascript
// Yjs 协作编辑
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

// 创建 Yjs 文档
const doc = new Y.Doc();
const yText = doc.getText('content');

// 创建 WebSocket 提供者
const provider = new WebsocketProvider(
    'ws://localhost:8080/yjs/ws?document=doc1&user=user1',
    'doc1',
    doc
);

// 监听文档变化
yText.observe((event) => {
    console.log('Document changed:', event);
});

// 修改文档
yText.insert(0, 'Hello');
```

#### 2.2 替换数据同步

**旧代码 (ShareDB):**
```javascript
// ShareDB 数据同步
doc.on('op', (op, source) => {
    if (source) return; // 忽略自己的操作
    
    // 处理远程操作
    updateUI(op);
});
```

**新代码 (SSE):**
```javascript
// SSE 数据同步
const eventSource = new EventSource(
    'http://localhost:8080/api/realtime?client_id=client1&user_id=user1'
);

eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    switch (data.type) {
        case 'record_create':
            handleRecordCreate(data.data.record);
            break;
        case 'record_update':
            handleRecordUpdate(data.data.record);
            break;
        case 'record_delete':
            handleRecordDelete(data.data.record);
            break;
    }
};

// 订阅特定频道
fetch('http://localhost:8080/api/realtime', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        client_id: 'client1',
        subscriptions: ['records', 'users', 'notifications']
    })
});
```

### 3. 感知信息 (Awareness)

**新功能 - 用户感知:**
```javascript
// Yjs 感知信息
provider.awareness.setLocalStateField('user', {
    name: 'John Doe',
    color: '#ff0000',
    cursor: { row: 1, column: 5 }
});

// 监听其他用户的感知信息
provider.awareness.on('change', () => {
    const states = provider.awareness.getStates();
    updateUserCursors(states);
});
```

## 🔧 配置和部署

### 1. 环境变量

```bash
# 实时通信配置
REALTIME_WS_PORT=8080
REALTIME_SSE_PORT=8080
REALTIME_MAX_CONNECTIONS=1000

# Yjs 配置
YJS_DOCUMENT_CLEANUP_INTERVAL=300s
YJS_MAX_DOCUMENT_SIZE=10MB

# SSE 配置
SSE_HEARTBEAT_INTERVAL=30s
SSE_MAX_CLIENT_BUFFER=100
```

### 2. 数据库集成

```go
// 集成您的数据库
type YjsPersistence struct {
    db *gorm.DB
    redis *redis.Client
}

func (yp *YjsPersistence) SaveUpdate(documentID string, update []byte) error {
    // 保存到 PostgreSQL
    return yp.db.Create(&DocumentUpdate{
        DocumentID: documentID,
        Update:     update,
        Timestamp:  time.Now(),
    }).Error
}

func (yp *YjsPersistence) GetMissingUpdates(documentID string, stateVector []byte) ([][]byte, error) {
    // 从数据库获取缺失的更新
    var updates []DocumentUpdate
    err := yp.db.Where("document_id = ? AND timestamp > ?", 
        documentID, stateVector).Find(&updates).Error
    
    result := make([][]byte, len(updates))
    for i, update := range updates {
        result[i] = update.Update
    }
    
    return result, err
}
```

## 📈 性能优化

### 1. 连接池管理

```go
// 优化连接管理
type ConnectionPool struct {
    maxConnections int
    connections    map[string]*Connection
    mu             sync.RWMutex
}

func (cp *ConnectionPool) GetConnection(userID string) *Connection {
    cp.mu.RLock()
    conn, exists := cp.connections[userID]
    cp.mu.RUnlock()
    
    if !exists {
        cp.mu.Lock()
        conn = cp.createConnection(userID)
        cp.connections[userID] = conn
        cp.mu.Unlock()
    }
    
    return conn
}
```

### 2. 消息批处理

```go
// 批处理消息
type MessageBatcher struct {
    messages []Message
    mu       sync.Mutex
    ticker   *time.Ticker
}

func (mb *MessageBatcher) AddMessage(msg Message) {
    mb.mu.Lock()
    mb.messages = append(mb.messages, msg)
    mb.mu.Unlock()
}

func (mb *MessageBatcher) Flush() {
    mb.mu.Lock()
    if len(mb.messages) > 0 {
        mb.broadcastBatch(mb.messages)
        mb.messages = mb.messages[:0]
    }
    mb.mu.Unlock()
}
```

## 🧪 测试

### 1. 单元测试

```go
func TestYjsManager(t *testing.T) {
    logger := zap.NewNop()
    manager := NewYjsManager(logger)
    
    // 测试文档创建
    doc := manager.getDocument("test-doc")
    assert.NotNil(t, doc)
    
    // 测试更新应用
    update := []byte("test update")
    err := manager.applyUpdateToDocument("test-doc", update)
    assert.NoError(t, err)
}
```

### 2. 集成测试

```go
func TestRealtimeIntegration(t *testing.T) {
    // 启动测试服务器
    server := httptest.NewServer(setupTestRoutes())
    defer server.Close()
    
    // 测试 WebSocket 连接
    conn, _, err := websocket.DefaultDialer.Dial(
        strings.Replace(server.URL, "http", "ws", 1)+"/yjs/ws?document=test&user=user1",
        nil,
    )
    assert.NoError(t, err)
    defer conn.Close()
    
    // 测试消息发送
    message := YjsMessage{
        Type:     "update",
        Document: "test",
        Update:   []byte("test update"),
    }
    
    err = conn.WriteJSON(message)
    assert.NoError(t, err)
}
```

## 🚨 常见问题

### 1. 连接断开

**问题:** WebSocket 连接频繁断开
**解决方案:**
```javascript
// 自动重连
provider.on('connection-close', () => {
    setTimeout(() => {
        provider.connect();
    }, 1000);
});
```

### 2. 数据同步延迟

**问题:** 数据同步有延迟
**解决方案:**
```go
// 优化批处理
func (m *Manager) optimizeBatchSize() {
    if len(m.pendingUpdates) > 100 {
        m.flushUpdates()
    }
}
```

### 3. 内存泄漏

**问题:** 长时间运行后内存占用过高
**解决方案:**
```go
// 定期清理
func (m *Manager) cleanup() {
    ticker := time.NewTicker(5 * time.Minute)
    go func() {
        for range ticker.C {
            m.cleanupInactiveConnections()
            m.cleanupOldDocuments()
        }
    }()
}
```

## 📚 参考资源

- [Yjs 官方文档](https://docs.yjs.dev/)
- [Server-Sent Events 规范](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [CRDT 算法介绍](https://crdt.tech/)
- [WebSocket 最佳实践](https://tools.ietf.org/html/rfc6455)

## 🎉 迁移完成

恭喜！您已经成功从 ShareDB 迁移到 Yjs + SSE 系统。新系统将为您提供：

- ✅ 更好的协作体验
- ✅ 更强的离线支持
- ✅ 更简单的冲突解决
- ✅ 更高的性能
- ✅ 更低的复杂度

如果您在迁移过程中遇到任何问题，请参考本文档或联系开发团队。
