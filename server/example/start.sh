#!/bin/bash

# YJS 服务器测试演示启动脚本

echo "🚀 启动 YJS 服务器测试演示"
echo "================================"

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到 Node.js，请先安装 Node.js"
    echo "   下载地址: https://nodejs.org/"
    exit 1
fi

# 检查 npm 是否安装
if ! command -v npm &> /dev/null; then
    echo "❌ 错误: 未找到 npm，请先安装 npm"
    exit 1
fi

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 请在项目根目录运行此脚本"
    echo "   当前目录: $(pwd)"
    echo "   请切换到: /Users/leven/space/b/golang/server/example"
    exit 1
fi

# 检查依赖是否安装
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖包..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 依赖安装失败"
        exit 1
    fi
    echo "✅ 依赖安装完成"
fi

# 检查主服务器是否运行
echo "🔍 检查主服务器状态..."
if curl -s http://localhost:8888/health > /dev/null 2>&1; then
    echo "✅ 主服务器正在运行 (http://localhost:8888)"
else
    echo "⚠️  警告: 主服务器未运行或无法访问"
    echo "   请确保主服务器在 http://localhost:8888 运行"
    echo "   启动命令: cd /Users/leven/space/b/golang/server && go run main.go"
    echo ""
    read -p "是否继续启动演示应用? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ 取消启动"
        exit 1
    fi
fi

# 启动演示应用
echo "🎯 启动 React 演示应用..."
echo "   应用地址: http://localhost:3000"
echo "   服务器地址: ws://localhost:8888/yjs/ws"
echo ""
echo "💡 提示:"
echo "   - 使用默认账号登录: test@example.com / Test123456"
echo "   - 选择空间、Base和表进行实时订阅"
echo "   - 打开多个浏览器标签页测试实时协作"
echo "   - 使用连接测试页面诊断连接问题"
echo "   - 使用性能测试页面评估服务器性能"
echo ""

# 启动开发服务器
npm start
