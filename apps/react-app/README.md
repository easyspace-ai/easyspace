# React 应用

这是一个使用 React + TypeScript + Vite 构建的简单应用。

## 特性

- ⚡️ Vite - 快速的构建工具
- ⚛️ React 18 - 最新的 React 版本
- 🔷 TypeScript - 类型安全
- 🎨 CSS - 样式支持
- 📦 ESLint - 代码质量检查

## 开始使用

这个项目是 Turbo 工作区的一部分，可以使用以下命令：

### 从根目录运行（推荐）

```bash
# 安装所有依赖
bun install

# 启动开发服务器
bun run dev --filter=react-app

# 构建生产版本
bun run build --filter=react-app

# 运行所有项目的开发服务器
bun run dev

# 构建所有项目
bun run build
```

### 在项目目录中运行

```bash
cd apps/react-app

# 安装依赖
bun install

# 启动开发服务器
bun run dev

# 构建生产版本
bun run build

# 预览生产版本
bun run preview
```

应用将在 http://localhost:3000 启动

## 项目结构

```
react-app/
├── public/          # 静态资源
├── src/            # 源代码
│   ├── components/ # React 组件
│   ├── App.tsx     # 主应用组件
│   ├── App.css     # 应用样式
│   ├── main.tsx    # 应用入口
│   └── index.css   # 全局样式
├── index.html      # HTML 模板
├── package.json    # 项目配置
├── tsconfig.json   # TypeScript 配置
└── vite.config.ts  # Vite 配置
```

## 开发

编辑 `src/App.tsx` 文件来修改应用。保存文件后，浏览器会自动刷新显示更改。
