# YJS库集成指南

## 概述

本指南介绍如何将新的YJS库（`pkg/yjs`）集成到现有的实时通信系统中，替换旧的YJS实现。

## 架构变更

### 原有架构
```
Manager
├── YjsManager (旧实现)
├── SimpleYjsManager (简化版)
└── SSEManager
```

### 新架构
```
Manager
├── YjsManager (旧实现，保留兼容性)
├── SimpleYjsManager (简化版，保留兼容性)
├── NewYjsManager (新YJS库实现) ✨
└── SSEManager
```

## 新功能特性

### 1. 基于新YJS库的协作管理器 (NewYjsManager)

- **完整的CRDT支持**: 使用`pkg/yjs`库提供的完整CRDT功能
- **事务管理**: 支持YJS事务机制，确保操作的原子性
- **事件监听**: 监听文档更新和事务完成事件
- **自动清理**: 定期清理非活跃连接和会话
- **感知管理**: 支持用户感知信息（光标位置、选择状态等）

### 2. 文档管理

- **动态文档创建**: 按需创建YJS文档
- **会话管理**: 每个文档支持多个用户会话
- **状态同步**: 自动同步文档状态向量
- **更新广播**: 实时广播文档更新给所有相关会话

### 3. 连接管理

- **WebSocket连接**: 支持WebSocket连接升级
- **连接池管理**: 自动管理连接生命周期
- **心跳检测**: 定期检测连接活跃状态
- **优雅关闭**: 支持连接的优雅关闭

## 使用方法

### 1. 基本使用

```go
// 创建实时通信管理器
manager := realtime.NewManager(logger)

// 处理YJS WebSocket连接（使用新YJS库）
router.GET("/yjs/ws", manager.HandleYjsWebSocket)

// 处理旧版YJS WebSocket连接（兼容性）
router.GET("/yjs/ws/legacy", manager.HandleYjsWebSocketLegacy)
```

### 2. 获取新YJS管理器

```go
// 获取新YJS管理器实例
newYjsManager := manager.GetNewYjsManager()

// 获取统计信息
stats := newYjsManager.GetStats()
fmt.Printf("Documents: %v, Connections: %v\n", 
    stats["documents"], stats["connections"])
```

### 3. 客户端连接

```javascript
// 连接到新的YJS WebSocket
const ws = new WebSocket('ws://localhost:8080/yjs/ws?document=table123&user=user456');

// 发送同步消息
ws.send(JSON.stringify({
    type: 'sync',
    document: 'table123'
}));

// 发送更新消息
ws.send(JSON.stringify({
    type: 'update',
    document: 'table123',
    update: updateBytes
}));

// 发送感知消息
ws.send(JSON.stringify({
    type: 'awareness',
    document: 'table123',
    awareness: awarenessData
}));
```

## API接口

### WebSocket消息格式

#### 同步消息
```json
{
    "type": "sync",
    "document": "table123"
}
```

#### 更新消息
```json
{
    "type": "update",
    "document": "table123",
    "update": [1, 2, 3, 4, 5]
}
```

#### 感知消息
```json
{
    "type": "awareness",
    "document": "table123",
    "awareness": {
        "cursor": {"x": 100, "y": 200},
        "selection": {"start": 0, "end": 10}
    }
}
```

#### Ping消息
```json
{
    "type": "ping"
}
```

### 响应消息格式

#### 连接确认
```json
{
    "type": "connected",
    "document": "table123",
    "user_id": "user456"
}
```

#### 同步响应
```json
{
    "type": "sync",
    "document": "table123",
    "state": [1, 2, 3, 4, 5]
}
```

#### Pong响应
```json
{
    "type": "pong"
}
```

## 配置选项

### WebSocket升级器配置

```go
wsUpgrader := websocket.Upgrader{
    CheckOrigin: func(r *http.Request) bool {
        // 在生产环境中应该进行更严格的检查
        return true
    },
    ReadBufferSize:  1024,
    WriteBufferSize: 1024,
}
```

### 清理配置

- **连接超时**: 5分钟
- **清理间隔**: 30秒
- **心跳间隔**: 30秒

## 迁移指南

### 从旧YJS实现迁移

1. **更新路由**: 将YJS WebSocket路由指向新的处理器
   ```go
   // 旧方式
   router.GET("/yjs/ws", manager.HandleYjsWebSocketLegacy)
   
   // 新方式
   router.GET("/yjs/ws", manager.HandleYjsWebSocket)
   ```

2. **更新客户端**: 确保客户端使用正确的消息格式
3. **测试兼容性**: 验证现有功能是否正常工作
4. **监控性能**: 观察新实现的性能表现

### 兼容性支持

- **旧版支持**: 保留`HandleYjsWebSocketLegacy`方法
- **渐进迁移**: 可以同时运行新旧实现
- **回滚机制**: 如有问题可以快速回滚到旧实现

## 性能优化

### 1. 连接管理
- 自动清理非活跃连接
- 连接池复用
- 心跳检测优化

### 2. 文档管理
- 按需创建文档
- 文档状态缓存
- 更新批量处理

### 3. 内存管理
- 定期清理过期数据
- 文档生命周期管理
- 事件监听器清理

## 监控和调试

### 统计信息

```go
// 获取完整统计信息
stats := manager.GetStats()

// 新YJS管理器统计
newYjsStats := stats["new_yjs"].(map[string]interface{})
fmt.Printf("Documents: %v\n", newYjsStats["documents"])
fmt.Printf("Active Connections: %v\n", newYjsStats["active_connections"])
fmt.Printf("Active Sessions: %v\n", newYjsStats["active_sessions"])
```

### 日志记录

- **连接事件**: 连接建立、断开、错误
- **文档事件**: 文档创建、更新、销毁
- **会话事件**: 会话注册、取消注册
- **性能指标**: 消息处理时间、内存使用

## 故障排除

### 常见问题

1. **连接失败**
   - 检查WebSocket升级器配置
   - 验证CORS设置
   - 确认防火墙设置

2. **消息丢失**
   - 检查网络连接稳定性
   - 验证消息格式正确性
   - 确认事件监听器设置

3. **性能问题**
   - 监控连接数量
   - 检查内存使用情况
   - 优化清理策略

### 调试工具

```go
// 启用详细日志
logger := zap.NewDevelopment()

// 获取连接状态
connections := newYjsManager.GetStats()

// 监控文档状态
for docID, document := range newYjsManager.documents {
    fmt.Printf("Document %s: %d sessions\n", docID, len(document.Sessions))
}
```

## 最佳实践

1. **连接管理**
   - 实现连接重试机制
   - 设置合理的超时时间
   - 监控连接健康状态

2. **错误处理**
   - 优雅处理连接断开
   - 实现消息重发机制
   - 记录详细的错误日志

3. **性能优化**
   - 批量处理更新
   - 使用连接池
   - 定期清理资源

4. **安全考虑**
   - 验证WebSocket来源
   - 实现用户认证
   - 限制连接数量

## 未来计划

1. **功能增强**
   - 支持更多YJS数据类型
   - 实现离线同步
   - 添加冲突解决策略

2. **性能优化**
   - 实现消息压缩
   - 优化网络传输
   - 添加缓存机制

3. **监控改进**
   - 添加性能指标
   - 实现健康检查
   - 集成监控系统
