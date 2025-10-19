import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="App">
      <header className="App-header">
        <h1>欢迎使用 React 应用</h1>
        <p>这是一个简单的 React + TypeScript + Vite 项目</p>
        
        <div className="card">
          <button onClick={() => setCount((count) => count + 1)}>
            点击次数: {count}
          </button>
          <p>
            编辑 <code>src/App.tsx</code> 并保存以测试热重载
          </p>
        </div>
        
        <div className="features">
          <h2>项目特性</h2>
          <ul>
            <li>⚡️ Vite - 快速的构建工具</li>
            <li>⚛️ React 18 - 最新的 React 版本</li>
            <li>🔷 TypeScript - 类型安全</li>
            <li>🎨 CSS - 样式支持</li>
          </ul>
        </div>
      </header>
    </div>
  )
}

export default App
