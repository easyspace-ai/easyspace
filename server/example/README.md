# YJS 服务器测试演示

这是一个 React 演示应用，用于测试主服务器的 YJS 实时协作功能。

## 功能特性

### 🔐 用户认证
- **JWT 认证**: 基于 JWT 的用户认证系统
- **自动登录**: 支持 token 自动验证和用户信息获取
- **默认账号**: 提供默认管理员账号用于测试
- **安全登出**: 完整的登出和 token 清理机制

### 📊 表订阅演示
- **空间管理**: 浏览和选择用户的空间
- **Base 管理**: 查看空间下的 Base 列表
- **表管理**: 选择 Base 下的表进行订阅
- **实时订阅**: 通过 YJS 实时订阅表的业务事件
- **事件监控**: 实时显示表的创建、更新、删除等事件
- **多客户端同步**: 支持多标签页实时同步

### 🚀 YJS 演示
- **实时文本协作编辑**: 多用户同时编辑文本，实时同步
- **实时数组操作**: 添加、删除数组项目，支持并发操作
- **实时键值对操作**: 管理键值对数据，支持实时更新
- **自动冲突解决**: 基于 CRDT 的自动冲突解决机制
- **离线同步支持**: 支持离线编辑和重新连接同步

### 🔌 连接测试
- **连接状态监控**: 实时显示连接状态和同步状态
- **消息日志**: 详细记录所有 WebSocket 消息
- **错误处理**: 完整的错误处理和重连机制
- **配置管理**: 可配置服务器地址、房间名称等参数
- **日志导出**: 支持导出连接日志用于调试

### ⚡ 性能测试
- **延迟测试**: 测量网络延迟和响应时间
- **吞吐量测试**: 测试消息处理能力
- **并发用户测试**: 模拟多用户同时连接
- **数据一致性测试**: 验证数据同步的一致性
- **性能报告**: 生成详细的性能测试报告

## 快速开始

### 1. 安装依赖

```bash
cd /Users/leven/space/b/golang/server/example
npm install
```

### 2. 启动主服务器

确保主服务器正在运行：

```bash
cd /Users/leven/space/b/golang/server
go run main.go
```

服务器将在 `http://localhost:8888` 启动，YJS WebSocket 端点为 `ws://localhost:8888/yjs/ws`

### 3. 启动演示应用

```bash
npm start
```

应用将在 `http://localhost:3000` 启动

### 4. 登录和测试

1. 访问 `http://localhost:3000`
2. 使用默认账号登录：
   - **邮箱**: test@example.com
   - **密码**: Test123456
3. 在"表订阅演示"页面：
   - 选择空间 → 选择Base → 选择表
   - 观察实时订阅状态和业务事件
4. 在"YJS 演示"页面：
   - 编辑文本、添加数组项目或键值对
   - 打开多个标签页观察实时同步效果

## 使用说明

### 登录页面

1. **默认账号**: 使用 test@example.com / Test123456 登录
2. **自动验证**: 系统会自动验证 token 并获取用户信息
3. **功能预览**: 页面显示所有可用功能特性

### 表订阅演示页面

1. **空间选择**: 从左侧面板选择用户的空间
2. **Base选择**: 选择空间下的 Base
3. **表选择**: 选择 Base 下的表进行订阅
4. **订阅状态**: 右侧面板显示 YJS 连接和同步状态
5. **业务事件**: 实时显示表的业务事件（创建、更新、删除等）
6. **多客户端**: 打开多个标签页测试实时同步

### YJS 演示页面

1. **连接状态**: 页面顶部显示连接状态和同步状态
2. **房间配置**: 可以修改房间名称和用户名
3. **文本编辑**: 在文本区域输入内容，支持实时协作
4. **数组操作**: 添加或删除数组项目
5. **键值对操作**: 管理键值对数据
6. **数据统计**: 实时显示数据统计信息

### 连接测试页面

1. **连接配置**: 设置服务器地址、端点路径、房间名称和用户ID
2. **连接控制**: 连接或断开与服务器的连接
3. **测试操作**: 发送测试消息、更新和感知信息
4. **状态监控**: 查看连接状态、消息计数和错误计数
5. **日志查看**: 实时查看连接日志，支持导出

### 性能测试页面

1. **测试控制**: 运行完整的性能测试套件
2. **统计信息**: 查看测试统计和性能指标
3. **测试结果**: 详细的测试结果和性能数据
4. **结果导出**: 导出测试结果为 JSON 格式

## 技术架构

### 前端技术栈
- **React 18**: 现代化的用户界面框架
- **YJS**: 实时协作的 CRDT 库
- **WebSocket**: 实时双向通信
- **CSS3**: 现代化的样式设计

### 后端集成
- **Go WebSocket 服务器**: 主服务器提供 YJS WebSocket 端点
- **YJS CRDT**: 基于 Go 的 YJS 实现
- **实时同步**: 支持多用户实时协作
- **连接管理**: 自动连接管理和错误恢复

### 核心组件

#### GoWebSocketProvider
```javascript
// 连接到 Go 服务器的 YJS WebSocket 端点
const provider = new GoWebSocketProvider('room-name', {
  serverUrl: 'ws://localhost:8888',
  endpoint: '/yjs/ws',
  userId: 'user-id'
});
```

#### useYjs Hooks
```javascript
// 使用 YJS 文本
const { text, updateText, connected } = useYjsText('room-name', 'text');

// 使用 YJS 数组
const { array, push, delete: deleteItem } = useYjsArray('room-name', 'array');

// 使用 YJS Map
const { map, set, delete: deleteKey } = useYjsMap('room-name', 'map');
```

## 配置说明

### 服务器配置
主服务器配置文件 `config.yaml` 中的相关设置：

```yaml
server:
  host: '0.0.0.0'
  port: 8888
  enable_cors: true

websocket:
  enable_redis_pubsub: true
  heartbeat_interval: '30s'
  connection_timeout: '60s'
  max_connections: 1000
```

### 客户端配置
可以在 `GoWebSocketProvider` 中配置：

```javascript
const options = {
  serverUrl: 'ws://localhost:8888',  // 服务器地址
  endpoint: '/yjs/ws',               // WebSocket 端点
  userId: 'user-id',                 // 用户ID
  maxReconnectAttempts: 5,           // 最大重连次数
  reconnectDelay: 1000,              // 重连延迟
  heartbeatInterval: 30000           // 心跳间隔
};
```

## 故障排除

### 常见问题

1. **连接失败**
   - 检查主服务器是否正在运行
   - 确认服务器地址和端口正确
   - 检查防火墙设置

2. **同步问题**
   - 确认 WebSocket 连接正常
   - 检查网络连接稳定性
   - 查看浏览器控制台错误信息

3. **性能问题**
   - 运行性能测试诊断问题
   - 检查服务器资源使用情况
   - 优化网络连接

### 调试工具

1. **浏览器开发者工具**
   - Network 标签查看 WebSocket 连接
   - Console 标签查看错误信息
   - Application 标签查看本地存储

2. **连接日志**
   - 在连接测试页面查看详细日志
   - 导出日志文件用于分析

3. **性能测试**
   - 运行完整的性能测试套件
   - 分析测试结果和性能指标

## 开发指南

### 添加新功能

1. **创建新的 Hook**
   ```javascript
   export function useYjsCustom(roomName, typeName, options = {}) {
     const { doc, connected, synced, error } = useYjs(roomName, options);
     // 实现自定义逻辑
     return { /* 返回状态和方法 */ };
   }
   ```

2. **扩展 WebSocket 提供者**
   ```javascript
   class CustomWebSocketProvider extends GoWebSocketProvider {
     // 添加自定义功能
   }
   ```

3. **添加新的测试**
   ```javascript
   const testCustomFeature = async () => {
     // 实现测试逻辑
   };
   ```

### 代码结构

```
src/
├── components/          # React 组件
│   ├── YjsTestDemo.js   # YJS 演示组件
│   ├── ConnectionTest.js # 连接测试组件
│   └── PerformanceTest.js # 性能测试组件
├── yjs/                # YJS 相关代码
│   ├── GoWebSocketProvider.js # WebSocket 提供者
│   └── useYjs.js       # YJS Hooks
├── App.js              # 主应用组件
└── index.js            # 应用入口
```

## 许可证

本项目采用 MIT 许可证。

## 贡献

欢迎提交 Issue 和 Pull Request 来改进这个演示应用。

## 联系方式

如有问题或建议，请通过以下方式联系：

- 创建 GitHub Issue
- 发送邮件到项目维护者

---

**注意**: 这是一个演示应用，主要用于测试和验证 YJS 服务器的功能。在生产环境中使用前，请确保进行充分的安全性和性能测试。
