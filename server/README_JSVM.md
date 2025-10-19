# 🚀 独立 JSVM 实现

这个项目借鉴了 PocketBase 的核心优点，但完全独立实现，可以无缝集成到您现有的 Gin 项目中。

## 🎯 核心特性

### 1. **JavaScript 运行时 (JSVM)**
- 基于 `goja` 的 JavaScript 运行时
- 支持 Node.js 风格的 API
- 运行时池管理
- 热重载支持

### 2. **钩子系统**
- 丰富的事件钩子
- 优先级支持
- 自动注册和触发
- 错误处理

### 3. **插件系统**
- 动态加载 JavaScript 插件
- 插件配置管理
- 插件生命周期管理
- 插件 API 暴露

### 4. **实时通信**
- WebSocket 支持
- 频道订阅
- 消息广播
- 用户消息

### 5. **热重载**
- 文件监控
- 自动重载
- 开发友好

## 📁 项目结构

```
server/
├── internal/
│   ├── jsvm/                 # JavaScript 运行时
│   │   ├── runtime.go       # 运行时管理器
│   │   ├── pool.go          # 运行时池
│   │   ├── hooks.go         # 钩子管理器
│   │   └── plugins.go       # 插件管理器
│   └── realtime/            # 实时通信
│       └── manager.go       # 实时通信管理器
├── hooks/                   # 钩子文件
│   └── user_hooks.js       # 用户钩子示例
├── plugins/                 # 插件文件
│   └── audit_logger.js     # 审计日志插件示例
└── cmd/
    └── gin-with-jsvm/      # 集成示例
        └── main.go
```

## 🚀 快速开始

### 1. 启动服务器

```bash
go run cmd/gin-with-jsvm/main.go
```

### 2. 访问服务

- **API**: `http://localhost:8080/api/v1/users`
- **WebSocket**: `ws://localhost:8080/ws`
- **管理界面**: `http://localhost:8080/admin/hooks`

### 3. 测试钩子

```bash
# 创建用户（会触发 onUserCreate 钩子）
curl -X POST http://localhost:8080/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John Doe", "email": "john@example.com"}'

# 获取用户列表（会触发 onUserList 钩子）
curl http://localhost:8080/api/v1/users
```

## 🔧 使用方法

### 1. 创建钩子

在 `hooks/` 目录下创建 JavaScript 文件：

```javascript
// hooks/my_hooks.js
function onUserCreate(data) {
    console.log("User created:", data);
    
    // 自定义逻辑
    log.info("New user created:", data.name);
    
    // 触发事件
    events.emit("user.created", data);
}

function onUserUpdate(data) {
    console.log("User updated:", data);
    
    // 自定义逻辑
    log.info("User updated:", data.user_id);
}
```

### 2. 创建插件

在 `plugins/` 目录下创建 JavaScript 文件：

```javascript
// plugins/my_plugin.js
const pluginConfig = {
    id: "my_plugin",
    name: "My Plugin",
    version: "1.0.0",
    description: "我的插件",
    author: "Your Name",
    hooks: ["onUserCreate", "onUserUpdate"],
    config: {
        enabled: true,
        logLevel: "info"
    }
};

function onUserCreate(data) {
    // 插件逻辑
    log.info("Plugin: User created", data);
}

function onUserUpdate(data) {
    // 插件逻辑
    log.info("Plugin: User updated", data);
}

module.exports = pluginConfig;
```

### 3. 集成到现有项目

```go
// 在您现有的 Gin 项目中
func main() {
    r := gin.Default()
    
    // 创建 JSVM 管理器
    jsvmManager, err := jsvm.NewRuntimeManager(jsvm.DefaultConfig(), logger)
    if err != nil {
        log.Fatal(err)
    }
    defer jsvmManager.Shutdown()
    
    // 加载钩子和插件
    jsvmManager.LoadHooks()
    jsvmManager.LoadPlugins()
    
    // 设置路由
    r.POST("/api/users", func(c *gin.Context) {
        var user map[string]interface{}
        c.ShouldBindJSON(&user)
        
        // 触发钩子
        jsvmManager.TriggerHook("onUserCreate", user)
        
        c.JSON(201, gin.H{"user": user})
    })
    
    r.Run(":8080")
}
```

## 📊 可用的 JavaScript API

### 日志 API
```javascript
log.info("信息日志");
log.error("错误日志");
log.warn("警告日志");
log.debug("调试日志");
```

### 工具 API
```javascript
const id = utils.uuid();        // 生成 UUID
const now = utils.now();        // 获取当前时间戳
```

### 事件 API
```javascript
events.emit("custom.event", {data: "value"});
```

### 应用 API
```javascript
// 注册钩子
app.onUserCreate(function(data) {
    console.log("User created:", data);
});
```

## 🔌 实时通信

### WebSocket 连接

```javascript
const ws = new WebSocket('ws://localhost:8080/ws?client_id=my_client&user_id=user123');

ws.onopen = () => {
    console.log('Connected to WebSocket');
    
    // 订阅频道
    ws.send(JSON.stringify({
        type: 'subscribe',
        data: 'users'
    }));
};

ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    console.log('Received:', message);
};
```

### 消息类型

- `subscribe` - 订阅频道
- `unsubscribe` - 取消订阅
- `ping` - 心跳检测
- `broadcast` - 广播消息

## 🛠️ 配置选项

```go
config := &jsvm.Config{
    HooksDir:             "./hooks",           // 钩子目录
    HooksWatch:           true,                // 启用热重载
    HooksPoolSize:        10,                  // 运行时池大小
    PluginsDir:           "./plugins",         // 插件目录
    HooksFilesPattern:    `^.*\.js$`,          // 钩子文件匹配模式
    PluginsFilesPattern:  `^.*\.js$`,          // 插件文件匹配模式
    OnInit: func(vm *goja.Runtime) {
        // 运行时初始化回调
        vm.Set("customAPI", map[string]interface{}{
            "myFunction": func() string {
                return "Hello from custom API";
            },
        });
    },
}
```

## 📈 监控和统计

### 获取统计信息

```bash
# 获取钩子统计
curl http://localhost:8080/admin/hooks

# 获取插件统计
curl http://localhost:8080/admin/plugins

# 获取实时通信统计
curl http://localhost:8080/admin/realtime/stats

# 获取 JSVM 统计
curl http://localhost:8080/admin/jsvm/stats
```

## 🐛 故障排除

### 常见问题

1. **钩子不执行**
   - 检查钩子文件语法
   - 确认钩子目录路径正确
   - 查看日志中的错误信息

2. **插件加载失败**
   - 检查插件配置文件
   - 确认插件代码语法正确
   - 查看插件管理器日志

3. **热重载不工作**
   - 确认文件监控权限
   - 检查文件系统支持
   - 查看文件监控日志

## 🚀 部署建议

### 生产环境配置

```go
config := &jsvm.Config{
    HooksWatch: false,        // 生产环境关闭热重载
    HooksPoolSize: 50,        // 增加池大小
    OnInit: func(vm *goja.Runtime) {
        // 生产环境初始化
    },
}
```

### 性能优化

1. **运行时池大小** - 根据并发需求调整
2. **钩子优先级** - 合理设置钩子执行顺序
3. **插件管理** - 及时清理不需要的插件
4. **内存管理** - 监控运行时内存使用

## 📚 更多资源

- [Goja 文档](https://github.com/dop251/goja)
- [Gorilla WebSocket](https://github.com/gorilla/websocket)
- [Gin 文档](https://gin-gonic.com/docs/)

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目！

## 📄 许可证

MIT License
