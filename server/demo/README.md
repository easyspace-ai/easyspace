# YJS WebSocket服务器

基于Go语言YJS CRDT库的实时协作服务器。

## 🚀 一键启动

```bash
cd /Users/leven/space/b/golang/server/demo
./run.sh
```

就这么简单！访问 http://localhost:8080/demo/ 即可。

## 📡 服务端点

- **演示页面**: http://localhost:8080/demo/
- **WebSocket**: ws://localhost:8080/ws?room=房间名
- **状态查询**: http://localhost:8080/status

## 🔧 手动启动（如果需要）

```bash
# 1. 构建React项目
cd demo && npm install && npm run build && cd ..

# 2. 启动服务器
go run main.go
```

## 📁 项目结构

```
server/demo/
├── main.go          # Go服务器
├── demo/            # React前端
│   ├── src/         # 源代码
│   └── build/       # 编译输出
├── run.sh           # 一键启动脚本
└── README.md        # 说明文档
```

## 🎯 功能特性

- ✅ YJS CRDT实时同步
- ✅ WebSocket通信
- ✅ 多房间支持
- ✅ React前端演示
- ✅ 一键启动

就这么简单！🎉