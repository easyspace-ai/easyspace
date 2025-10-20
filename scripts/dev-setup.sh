#!/bin/bash

# EasySpace 开发环境设置脚本
# 用于快速设置和优化开发环境

set -e

echo "🚀 EasySpace 开发环境设置开始..."

# 检查 Bun 是否安装
if ! command -v bun &> /dev/null; then
    echo "❌ Bun 未安装，正在安装..."
    curl -fsSL https://bun.sh/install | bash
    source ~/.bashrc
fi

echo "✅ Bun 版本: $(bun --version)"

# 检查 Node.js 版本
NODE_VERSION=$(node --version 2>/dev/null || echo "未安装")
echo "📦 Node.js 版本: $NODE_VERSION"

# 安装依赖
echo "📦 安装依赖..."
bun install

# 同步版本
echo "🔄 同步依赖版本..."
node scripts/sync-versions.js

# 重新安装以确保版本同步
echo "🔄 重新安装依赖以确保版本同步..."
bun install

# 运行类型检查
echo "🔍 运行类型检查..."
bun run typecheck

# 运行代码检查
echo "🔍 运行代码检查..."
bun run lint

# 格式化代码
echo "💅 格式化代码..."
bun run format:fix

echo "✅ 开发环境设置完成！"
echo ""
echo "📋 可用命令:"
echo "  bun run dev          - 启动开发服务器"
echo "  bun run build        - 构建项目"
echo "  bun run test         - 运行测试"
echo "  bun run lint         - 代码检查"
echo "  bun run format       - 代码格式化"
echo "  bun run typecheck    - 类型检查"
echo ""
echo "🎉 开始开发吧！"
