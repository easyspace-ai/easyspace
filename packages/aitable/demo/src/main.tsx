import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// 样式导入 - 开发环境使用相对路径
import '../../src/styles/index.css';

// 保留原有的样式文件作为备用
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

