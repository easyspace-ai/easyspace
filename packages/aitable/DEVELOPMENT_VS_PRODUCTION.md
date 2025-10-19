# 开发环境 vs 生产环境 CSS 导入指南

## 概述

由于 Demo 项目使用源码直接开发（热更新），而不是构建后的文件，所以 CSS 导入路径在开发和生产环境下有所不同。

## 开发环境（Demo 项目）

### 当前配置
```jsx
// packages/aitable/demo/src/main.tsx
import '@luckdb/aitable/src/styles/index.css';
```

### 原因
- Demo 项目配置了别名，直接指向源码
- 支持热更新和实时开发
- 不需要构建步骤

### Vite 配置
```typescript
// packages/aitable/demo/vite.config.ts
resolve: {
  alias: {
    '@luckdb/aitable': path.resolve(__dirname, '../src/index.ts'),
    '@luckdb/aitable/src/styles/index.css': path.resolve(__dirname, '../src/styles/index.css'),
    '@luckdb/sdk': path.resolve(__dirname, '../../sdk/src/index.ts'),
  },
}
```

## 生产环境（第三方项目）

### 标准导入方式
```jsx
// 第三方项目中的导入
import '@luckdb/aitable/dist/index.css';
import { StandardDataView } from '@luckdb/aitable';
```

### 原因
- 使用构建后的文件
- CSS 已经过压缩和优化
- 包含完整的 Tailwind CSS 样式

## 文件结构对比

### 开发环境（源码）
```
packages/aitable/src/
├── styles/
│   └── index.css          # 源码样式文件
├── components/
├── grid/
└── index.ts
```

### 生产环境（构建后）
```
packages/aitable/dist/
├── index.css              # 构建后的 CSS 文件
├── index.esm.js           # ESM 格式
├── index.cjs.js           # CommonJS 格式
└── index.d.ts             # TypeScript 声明
```

## 构建流程

### 1. 开发环境
```bash
# 在 Demo 目录中
cd packages/aitable/demo
npm run dev
```
- 直接使用源码
- 支持热更新
- 实时编译样式

### 2. 生产环境
```bash
# 在 aitable 目录中
cd packages/aitable
npm run build
```
- 生成 `dist/index.css`
- 压缩和优化
- 包含完整样式

## 第三方项目集成

### 1. 安装依赖
```bash
npm install @luckdb/aitable @luckdb/sdk
```

### 2. 导入样式和组件
```jsx
import React from 'react';
import '@luckdb/aitable/dist/index.css';  // 生产环境路径
import { StandardDataView, AppProviders } from '@luckdb/aitable';
import { LuckDB } from '@luckdb/sdk';

function App() {
  const sdk = new LuckDB({
    baseUrl: 'https://your-api.com',
    accessToken: 'your-token'
  });

  return (
    <AppProviders sdk={sdk}>
      <StandardDataView
        baseId="your-base-id"
        tableId="your-table-id"
        viewId="your-view-id"
      />
    </AppProviders>
  );
}
```

## 故障排除

### 1. 开发环境样式不显示
**问题**: Demo 项目中样式不显示
**解决**: 检查 Vite 配置中的别名设置

```typescript
// vite.config.ts
resolve: {
  alias: {
    '@luckdb/aitable/src/styles/index.css': path.resolve(__dirname, '../src/styles/index.css'),
  },
}
```

### 2. 生产环境样式不显示
**问题**: 第三方项目中样式不显示
**解决**: 确认使用正确的导入路径

```jsx
// ✅ 正确
import '@luckdb/aitable/dist/index.css';

// ❌ 错误
import '@luckdb/aitable/src/styles/index.css';
```

### 3. 构建错误
**问题**: 构建时找不到 CSS 文件
**解决**: 确保 Rollup 配置正确

```javascript
// rollup.config.js
{
  input: 'src/styles/index.css',
  output: {
    file: 'dist/index.css',
    format: 'es',
  },
  plugins: [
    postcss({
      extract: true,
      minimize: true,
    }),
  ],
}
```

## 最佳实践

### 1. 开发环境
- 使用源码路径进行开发
- 配置正确的 Vite 别名
- 支持热更新和实时预览

### 2. 生产环境
- 使用构建后的文件
- 确保 CSS 文件被正确导入
- 优化加载性能

### 3. 文档说明
- 明确区分开发和生产环境
- 提供完整的集成示例
- 包含故障排除指南

## 总结

- **开发环境**: 使用 `@luckdb/aitable/src/styles/index.css`
- **生产环境**: 使用 `@luckdb/aitable/dist/index.css`
- **第三方项目**: 始终使用生产环境路径
- **Demo 项目**: 使用开发环境路径以支持热更新

这种设计既保证了开发体验，又确保了生产环境的性能和稳定性。
