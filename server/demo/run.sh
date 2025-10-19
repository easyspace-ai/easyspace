#!/bin/bash

echo "🚀 一键启动YJS服务器"

# 清理端口
echo "🧹 清理端口..."
lsof -ti:8080 | xargs kill -9 2>/dev/null || true

# 检查并构建React项目
if [ ! -d "demo/build" ]; then
    echo "📦 构建React项目..."
    cd demo
    if [ ! -d "node_modules" ]; then
        echo "📥 安装npm依赖..."
        npm install
    fi
    echo "🔨 编译React项目..."
    npm run build
    cd ..
    echo "✅ React项目构建完成"
else
    echo "✅ React项目已构建"
fi

# 启动服务器
echo "🌐 启动服务器..."
echo "访问地址: http://localhost:8080/demo/"
echo "按 Ctrl+C 停止服务器"
echo ""

go run main.go
