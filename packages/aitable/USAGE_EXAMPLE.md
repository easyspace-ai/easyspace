# 使用示例 - CSS 导入

## 基本用法

### 1. 安装组件库

```bash
npm install @luckdb/aitable @luckdb/sdk
```

### 2. 导入样式

```jsx
import React from 'react';
import '@luckdb/aitable/dist/index.css'; // 导入样式
import { StandardDataView, AppProviders } from '@luckdb/aitable';
import { LuckDB } from '@luckdb/sdk';

function App() {
  // 创建 SDK 实例
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

export default App;
```

## 样式类名使用

### 工具栏样式

```jsx
// 工具栏容器
<div className="luckdb-toolbar">
  {/* 普通按钮 */}
  <button className="luckdb-toolbar-button">
    撤销
  </button>
  
  {/* 主要按钮 */}
  <button className="luckdb-toolbar-button-primary">
    新增
  </button>
  
  {/* 下拉选择器 */}
  <select className="luckdb-toolbar-dropdown">
    <option>中等</option>
    <option>紧凑</option>
  </select>
</div>
```

### 按钮样式

```jsx
// 主要按钮
<button className="luckdb-button luckdb-button-primary">
  确认
</button>

// 次要按钮
<button className="luckdb-button luckdb-button-secondary">
  取消
</button>

// 危险按钮
<button className="luckdb-button luckdb-button-danger">
  删除
</button>

// 幽灵按钮
<button className="luckdb-button luckdb-button-ghost">
  更多
</button>
```

### 表单样式

```jsx
<form>
  <div className="luckdb-form-group">
    <label className="luckdb-form-label">
      字段名称
    </label>
    <input 
      type="text" 
      className="luckdb-form-input"
      placeholder="请输入字段名称"
    />
  </div>
  
  <div className="luckdb-form-group">
    <label className="luckdb-form-label">
      字段类型
    </label>
    <select className="luckdb-form-select">
      <option>文本</option>
      <option>数字</option>
      <option>日期</option>
    </select>
  </div>
</form>
```

### 状态样式

```jsx
// 加载状态
<div className="luckdb-loading"></div>

// 错误状态
<div className="luckdb-error">
  操作失败，请重试
</div>

// 成功状态
<div className="luckdb-success">
  操作成功
</div>

// 警告状态
<div className="luckdb-warning">
  请注意相关设置
</div>
```

## 自定义主题

### 使用 CSS 变量

```css
:root {
  /* 主色调 */
  --luckdb-primary: #3b82f6;
  --luckdb-primary-hover: #2563eb;
  
  /* 背景色 */
  --luckdb-surface: #ffffff;
  --luckdb-surface-hover: #f8fafc;
  
  /* 边框色 */
  --luckdb-border: #e5e7eb;
  --luckdb-border-hover: #d1d5db;
  
  /* 文本色 */
  --luckdb-text-primary: #111827;
  --luckdb-text-secondary: #6b7280;
}
```

### 覆盖样式

```css
/* 自定义工具栏样式 */
.luckdb-toolbar {
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  border-bottom: 2px solid #4f46e5;
}

/* 自定义按钮样式 */
.luckdb-button-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.luckdb-button-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.6);
}
```

## 响应式设计

### 移动端适配

```jsx
// 响应式工具栏
<div className="luckdb-toolbar">
  <div className="luckdb-mobile-only">
    {/* 移动端专用按钮 */}
    <button className="luckdb-toolbar-button">
      菜单
    </button>
  </div>
  
  <div className="luckdb-desktop-only">
    {/* 桌面端专用按钮 */}
    <button className="luckdb-toolbar-button">
      撤销
    </button>
    <button className="luckdb-toolbar-button">
      重做
    </button>
  </div>
</div>
```

## 性能优化

### 按需导入

```jsx
// 只导入需要的样式类
import '@luckdb/aitable/dist/index.css';

// 或者使用 CSS Modules（如果支持）
import styles from '@luckdb/aitable/dist/index.css';
```

### 样式压缩

```js
// webpack.config.js
module.exports = {
  optimization: {
    minimize: true,
    minimizer: [
      new CssMinimizerPlugin(),
    ],
  },
};
```

## 最佳实践

### 1. 样式隔离

```jsx
// 使用容器类名避免样式冲突
<div className="luckdb-aitable">
  <StandardDataView {...props} />
</div>
```

### 2. 主题一致性

```css
/* 确保与你的应用主题一致 */
.luckdb-aitable {
  --luckdb-primary: var(--your-primary-color);
  --luckdb-surface: var(--your-background-color);
}
```

### 3. 性能考虑

```jsx
// 避免重复导入
// ❌ 错误：多次导入
import '@luckdb/aitable/dist/index.css';
import '@luckdb/aitable/dist/index.css';

// ✅ 正确：只导入一次
import '@luckdb/aitable/dist/index.css';
```

## 故障排除

### 样式不生效

1. **检查导入路径**：
   ```jsx
   import '@luckdb/aitable/dist/index.css'; // 正确
   import '@luckdb/aitable/index.css'; // 错误
   ```

2. **检查构建工具配置**：
   确保 Vite/Webpack 正确处理 CSS 导入

3. **检查样式优先级**：
   使用开发者工具检查样式是否被覆盖

### 样式冲突

1. **使用更具体的选择器**：
   ```css
   .my-app .luckdb-toolbar-button {
     /* 自定义样式 */
   }
   ```

2. **使用 CSS Modules**：
   ```jsx
   import styles from '@luckdb/aitable/dist/index.css';
   ```

3. **重置样式**：
   ```css
   .luckdb-aitable * {
     box-sizing: border-box;
   }
   ```
