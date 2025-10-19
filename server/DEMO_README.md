# 🎯 业务事件系统演示

## 概述

这是一个完整的业务事件系统演示，展示了如何通过SSE、WebSocket和Yjs实现实时业务数据同步。

## 🚀 快速启动

### 方法1: 使用启动脚本（推荐）

```bash
cd /Users/leven/space/b/golang/server
./start_demo.sh
```

### 方法2: 手动启动

1. **启动后端服务器**
```bash
cd /Users/leven/space/b/golang/server
go build -o luckdb-server ./cmd/luckdb
./luckdb-server serve --config config.yaml.example --port 8888
```

2. **启动前端演示页面**
```bash
cd examples/yjs-demo
npm install  # 首次运行
npm start
```

## 🎯 演示功能

### 1. 统一业务事件系统
- **表操作**: 创建、更新、删除表
- **字段操作**: 创建、更新、删除字段  
- **记录操作**: 创建、更新、删除记录
- **批量操作**: 批量创建、更新、删除记录

### 2. 多协议实时通信
- **SSE**: 服务器推送事件，轻量级数据同步
- **WebSocket**: 实时双向通信
- **Yjs**: 无冲突协作编辑

### 3. 智能事件路由
- **表事件** → `global` 频道
- **字段事件** → `table:{tableID}` 频道
- **记录事件** → `table:{tableID}` 和 `record:{recordID}` 频道

## 📱 访问地址

- **前端演示页面**: http://localhost:3000
- **后端API**: http://localhost:8888
- **健康检查**: http://localhost:8888/health

## 🔌 实时通信端点

- **SSE**: http://localhost:8888/api/realtime
- **传统WebSocket**: ws://localhost:8888/ws
- **新实时WebSocket**: ws://localhost:8888/realtime/ws
- **Yjs WebSocket**: ws://localhost:8888/yjs/ws

## 🎯 演示步骤

### 1. 基础配置
1. 打开浏览器访问 http://localhost:3000
2. 在配置面板中设置用户信息：
   - 用户ID: `user1`, `user2`, `user3` 等
   - 用户名: 自定义名称
   - 用户颜色: 选择不同颜色

### 2. SSE实时事件测试
1. 点击"连接SSE"按钮
2. 观察连接状态变为"已连接"
3. 使用"业务事件测试器"进行各种操作：
   - 点击"创建记录"按钮
   - 点击"更新记录"按钮
   - 点击"删除记录"按钮
4. 在SSE消息区域观察实时事件推送

### 3. 多用户协作测试
1. 打开多个浏览器窗口/标签页
2. 使用不同的用户ID连接
3. 在协作编辑器中输入内容
4. 观察多用户实时同步

### 4. 业务事件类型测试
- **表事件**: 创建/更新/删除表
- **字段事件**: 创建/更新/删除字段
- **记录事件**: 创建/更新/删除记录
- **批量事件**: 批量操作记录

## 🔧 技术架构

### 后端架构
```
业务操作 → BusinessEventManager → 多协议广播
                                    ├── SSE Manager
                                    ├── WebSocket Manager  
                                    └── Yjs Manager
```

### 事件流程
1. **业务操作触发** (表/字段/记录CRUD)
2. **事件发布** (BusinessEventManager)
3. **多协议广播** (SSE/WebSocket/Yjs)
4. **前端接收** (实时更新UI)

### 事件类型
- `table.create/update/delete` - 表操作事件
- `field.create/update/delete` - 字段操作事件
- `record.create/update/delete` - 记录操作事件
- `calculation.update` - 计算更新事件

## 📊 监控和调试

### 实时统计
- **实时统计**: http://localhost:8888/api/v1/realtime/stats
- **JSVM统计**: http://localhost:8888/api/v1/jsvm/stats

### 日志查看
后端服务器会输出详细的业务事件日志，包括：
- 事件发布日志
- 订阅者注册日志
- 消息广播日志

## 🎨 界面说明

### 配置面板
- 文档ID、用户ID、用户名、用户颜色、客户端ID

### 业务事件测试器
- 表操作按钮组
- 字段操作按钮组
- 记录操作按钮组
- 批量操作按钮组
- API响应显示区域

### SSE数据同步
- 连接状态显示
- 订阅频道管理
- 实时消息显示

### 协作编辑器
- Yjs实时协作编辑
- 用户感知显示
- 连接状态和日志

## 🔍 故障排除

### 常见问题

1. **服务器启动失败**
   - 检查端口8888是否被占用
   - 检查数据库连接配置
   - 查看服务器日志

2. **SSE连接失败**
   - 检查后端服务器是否运行
   - 检查网络连接
   - 查看浏览器控制台错误

3. **业务事件不推送**
   - 检查SSE连接状态
   - 检查订阅频道设置
   - 查看后端业务事件日志

### 调试技巧

1. **查看网络请求**
   - 打开浏览器开发者工具
   - 查看Network标签页
   - 观察SSE连接和API请求

2. **查看控制台日志**
   - 打开浏览器开发者工具
   - 查看Console标签页
   - 观察前端错误和日志

3. **查看服务器日志**
   - 查看终端输出的服务器日志
   - 关注业务事件相关的日志信息

## 🎉 演示亮点

1. **统一事件系统**: 所有业务操作通过统一的事件系统发布
2. **多协议支持**: SSE、WebSocket、Yjs同时支持业务事件
3. **智能路由**: 根据事件类型自动路由到合适的频道
4. **实时协作**: 多用户实时协作编辑
5. **可视化界面**: 直观的测试界面和实时状态显示

## 📝 扩展开发

### 添加新的事件类型
1. 在`events/business_event.go`中添加新的事件类型
2. 在相关服务中添加事件发布逻辑
3. 在前端添加对应的事件处理

### 添加新的实时通信协议
1. 实现`BusinessEventSubscriber`接口
2. 在`RealtimeManager`中注册新的管理器
3. 在前端添加对应的连接逻辑

---

**享受您的业务事件系统演示！** 🎉

