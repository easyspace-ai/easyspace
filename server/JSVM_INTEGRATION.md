# JSVM 集成说明

## 概述

JSVM (JavaScript Virtual Machine) 功能已成功集成到 LuckDB 系统中，提供了强大的 JavaScript 钩子和插件系统。

## 功能特性

### 1. JavaScript 钩子系统
- **用户钩子**: `onUserCreate`, `onUserUpdate`, `onUserDelete`
- **记录钩子**: `onRecordCreate`, `onRecordUpdate`, `onRecordDelete`
- **表格钩子**: `onTableCreate`, `onTableUpdate`, `onTableDelete`

### 2. 插件系统
- 动态加载 JavaScript 插件
- 插件配置管理
- 插件生命周期管理

### 3. 实时通信
- WebSocket 支持 (`/ws`)
- Yjs 协作 WebSocket (`/yjs/ws`)
- Server-Sent Events (`/api/realtime`)

## 配置

在 `config.yaml` 中添加以下配置：

```yaml
jsvm:
  enabled: true
  hooks_dir: "./hooks"
  hooks_watch: true
  hooks_pool_size: 10
  plugins_dir: "./plugins"
  hooks_files_pattern: "^.*\\.js$"
  plugins_files_pattern: "^.*\\.js$"
```

## API 端点

### JSVM 管理端点（需要认证）

- `GET /api/v1/jsvm/hooks` - 获取所有钩子
- `GET /api/v1/jsvm/plugins` - 获取所有插件
- `GET /api/v1/jsvm/stats` - 获取 JSVM 统计信息

### 实时通信端点

- `GET /ws` - 基础 WebSocket 连接
- `GET /yjs/ws` - Yjs 协作 WebSocket 连接
- `GET /api/realtime` - SSE 连接
- `POST /api/realtime` - SSE 订阅

### 实时通信统计端点（需要认证）

- `GET /api/v1/realtime/stats` - 获取实时通信统计信息

## 钩子使用示例

### 用户钩子

```javascript
// hooks/user_hooks.js
app.onUserCreate(function(data) {
    console.log("用户创建事件:", data);
    // 自定义逻辑：发送欢迎邮件、创建默认配置等
});

app.onUserUpdate(function(data) {
    console.log("用户更新事件:", data);
    // 自定义逻辑：记录变更日志、发送通知等
});
```

### 记录钩子

```javascript
// hooks/record_hooks.js
app.onRecordCreate(function(data) {
    console.log("记录创建事件:", data);
    // 自定义逻辑：数据验证、自动计算字段等
});

app.onRecordUpdate(function(data) {
    console.log("记录更新事件:", data);
    // 自定义逻辑：触发相关计算、发送通知等
});
```

## 插件开发示例

```javascript
// plugins/my_plugin.js
console.log("我的插件正在初始化...");

// 插件配置
const config = {
    name: "my_plugin",
    version: "1.0.0",
    description: "我的自定义插件"
};

// 注册钩子
app.onUserCreate(function(data) {
    console.log("插件处理用户创建:", data);
});

console.log("插件初始化完成");
```

## 启动系统

使用现有的 `luckdb` 命令启动系统：

```bash
# 启动服务器
go run cmd/luckdb/main.go serve

# 或者使用构建的二进制文件
./luckdb serve
```

## 文件结构

```
server/
├── hooks/                    # 钩子文件目录
│   └── user_hooks.js        # 用户钩子示例
├── plugins/                  # 插件文件目录
│   └── audit_logger.js      # 审计日志插件示例
├── internal/
│   ├── jsvm/                # JSVM 核心实现
│   ├── realtime/            # 实时通信实现
│   └── application/
│       └── hook_service.go  # 钩子服务
└── JSVM_INTEGRATION.md      # 本文档
```

## 注意事项

1. **性能**: JSVM 钩子执行是异步的，不会阻塞主业务流程
2. **错误处理**: 钩子执行失败不会影响主业务逻辑
3. **热重载**: 开发模式下支持钩子和插件的热重载
4. **安全性**: 钩子和插件在沙箱环境中执行，有访问限制

## 故障排除

### 钩子不触发
1. 检查 JSVM 是否启用 (`jsvm.enabled: true`)
2. 检查钩子文件是否在正确的目录 (`hooks/`)
3. 检查钩子文件语法是否正确
4. 查看服务器日志中的错误信息

### 插件不加载
1. 检查插件文件是否在正确的目录 (`plugins/`)
2. 检查插件文件语法是否正确
3. 检查插件文件匹配模式配置

### 实时通信不工作
1. 检查 WebSocket 连接是否正常
2. 检查客户端是否正确连接到端点
3. 查看服务器日志中的连接信息

## 开发建议

1. **钩子开发**: 保持钩子逻辑简单，避免长时间阻塞
2. **插件开发**: 使用模块化设计，便于维护和测试
3. **错误处理**: 在钩子和插件中添加适当的错误处理
4. **日志记录**: 使用 `log` API 记录重要信息
5. **性能监控**: 监控钩子和插件的执行性能

## 更新日志

- **v1.0.0**: 初始集成，支持基础钩子和插件系统
- 支持用户和记录操作的钩子触发
- 集成实时通信功能
- 提供管理 API 端点
