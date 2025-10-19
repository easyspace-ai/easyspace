#!/bin/bash

# 业务事件系统演示启动脚本
echo "🚀 启动业务事件系统演示..."

# 检查Go环境
if ! command -v go &> /dev/null; then
    echo "❌ Go 未安装，请先安装 Go"
    exit 1
fi

# 检查Node.js环境
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js"
    exit 1
fi

# 检查npm环境
if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装，请先安装 npm"
    exit 1
fi

echo "✅ 环境检查通过"

# 构建后端服务器
echo "🔨 构建后端服务器..."
cd /Users/leven/space/b/golang/server
go build -o luckdb-server ./cmd/luckdb

if [ $? -ne 0 ]; then
    echo "❌ 后端构建失败"
    exit 1
fi

echo "✅ 后端构建成功"

# 安装前端依赖
echo "📦 安装前端依赖..."
cd examples/yjs-demo
if [ ! -d "node_modules" ]; then
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 前端依赖安装失败"
        exit 1
    fi
fi

echo "✅ 前端依赖安装完成"

# 启动后端服务器（后台运行）
echo "🌐 启动后端服务器 (端口 8888)..."
cd /Users/leven/space/b/golang/server
./luckdb-server serve --config config.yaml.example &
SERVER_PID=$!

# 等待服务器启动
echo "⏳ 等待服务器启动..."
sleep 3

# 检查服务器是否启动成功
if ! curl -s http://localhost:8888/health > /dev/null; then
    echo "❌ 服务器启动失败"
    kill $SERVER_PID 2>/dev/null
    exit 1
fi

echo "✅ 后端服务器启动成功 (PID: $SERVER_PID)"

# 启动前端开发服务器
echo "🎨 启动前端开发服务器..."
cd examples/yjs-demo
npm start &
FRONTEND_PID=$!

echo "✅ 前端开发服务器启动成功 (PID: $FRONTEND_PID)"

echo ""
echo "🎉 演示环境启动完成！"
echo ""
echo "📱 前端地址: http://localhost:3000"
echo "🌐 后端地址: http://localhost:8888"
echo "📡 SSE 端点: http://localhost:8888/api/realtime"
echo "🔌 WebSocket: ws://localhost:8888/ws"
echo "🔌 新WebSocket: ws://localhost:8888/realtime/ws"
echo "🔌 Yjs WebSocket: ws://localhost:8888/yjs/ws"
echo ""
echo "🎯 演示步骤:"
echo "1. 打开浏览器访问 http://localhost:3000"
echo "2. 配置用户信息"
echo "3. 连接SSE"
echo "4. 使用业务事件测试器进行CRUD操作"
echo "5. 观察SSE消息区域的实时事件推送"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 等待用户中断
trap 'echo ""; echo "🛑 正在停止服务..."; kill $SERVER_PID $FRONTEND_PID 2>/dev/null; echo "✅ 服务已停止"; exit 0' INT

# 保持脚本运行
wait
