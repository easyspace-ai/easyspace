# CSS 导入功能测试

## 测试目标

验证其他项目可以通过 `import "@luckdb/aitable/dist/index.css"` 导入组件样式。

## 测试步骤

### 1. 创建测试项目

```bash
# 创建新的测试项目
mkdir css-import-test
cd css-import-test

# 初始化项目
npm init -y

# 安装必要的依赖
npm install react react-dom @luckdb/aitable @luckdb/sdk
```

### 2. 创建测试文件

**src/App.jsx**
```jsx
import React from 'react';
import '@luckdb/aitable/dist/index.css'; // 导入样式
import { StandardDataView, AppProviders } from '@luckdb/aitable';
import { LuckDB } from '@luckdb/sdk';

function App() {
  // 模拟 SDK 实例
  const sdk = new LuckDB({
    baseUrl: 'http://localhost:8080',
    accessToken: 'your-token-here'
  });

  return (
    <div className="luckdb-aitable">
      <h1>CSS 导入测试</h1>
      
      {/* 测试工具栏样式 */}
      <div className="luckdb-toolbar">
        <button className="luckdb-toolbar-button">
          撤销
        </button>
        <button className="luckdb-toolbar-button">
          重做
        </button>
        <button className="luckdb-toolbar-button-primary">
          +
        </button>
        <select className="luckdb-toolbar-dropdown">
          <option>中等</option>
          <option>紧凑</option>
          <option>宽松</option>
        </select>
      </div>

      {/* 测试组件 */}
      <div style={{ height: '400px' }}>
        <AppProviders sdk={sdk}>
          <StandardDataView
            baseId="test-base"
            tableId="test-table"
            viewId="test-view"
          />
        </AppProviders>
      </div>
    </div>
  );
}

export default App;
```

**src/index.js**
```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**index.html**
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CSS Import Test</title>
</head>
<body>
    <div id="root"></div>
</body>
</html>
```

### 3. 配置 Vite

**vite.config.js**
```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5176,
    open: true,
  },
});
```

### 4. 运行测试

```bash
# 安装 Vite
npm install -D vite @vitejs/plugin-react

# 启动开发服务器
npm run dev
```

### 5. 验证结果

检查以下内容：

- ✅ 工具栏按钮有正确的样式（圆角、阴影、悬停效果）
- ✅ 主要按钮显示为蓝色
- ✅ 下拉选择器有自定义样式
- ✅ 组件整体样式正常
- ✅ 没有样式冲突或缺失

## 预期结果

如果 CSS 导入功能正常工作，你应该看到：

1. **现代化的工具栏样式**：
   - 按钮有圆角和阴影
   - 悬停时有平滑的过渡效果
   - 主要按钮显示为蓝色主题色

2. **正确的组件样式**：
   - 表格有正确的边框和间距
   - 单元格有悬停效果
   - 整体布局美观

3. **无样式冲突**：
   - 没有原生浏览器样式
   - 所有元素都有统一的视觉风格

## 故障排除

如果样式没有正确显示：

1. **检查 CSS 文件是否存在**：
   ```bash
   ls node_modules/@luckdb/aitable/dist/index.css
   ```

2. **检查导入路径**：
   确保使用正确的导入路径：`@luckdb/aitable/dist/index.css`

3. **检查构建工具配置**：
   确保 Vite/Webpack 正确处理 CSS 导入

4. **检查浏览器开发者工具**：
   查看 Network 标签确认 CSS 文件被正确加载

## 成功标准

✅ CSS 文件可以被正确导入  
✅ 组件样式正常显示  
✅ 工具栏有现代化外观  
✅ 没有样式冲突  
✅ 性能良好（CSS 文件大小合理）
