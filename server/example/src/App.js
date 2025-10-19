import React, { useState, useEffect } from 'react';
import './App.css';
import LoginPage from './components/LoginPage';
import YjsTestDemo from './components/YjsTestDemo';
import ConnectionTest from './components/ConnectionTest';
import PerformanceTest from './components/PerformanceTest';
import TableSubscriptionDemo from './components/TableSubscriptionDemo';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function AppContent() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('tables');

  const tabs = [
    { id: 'tables', label: '表订阅演示', component: TableSubscriptionDemo },
    { id: 'demo', label: 'YJS 演示', component: YjsTestDemo },
    { id: 'connection', label: '连接测试', component: ConnectionTest },
    { id: 'performance', label: '性能测试', component: PerformanceTest }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || TableSubscriptionDemo;

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-content">
          <div className="header-left">
            <h1>🚀 YJS 服务器测试演示</h1>
            <p>测试主服务器的 YJS 实时协作功能</p>
          </div>
          <div className="header-right">
            <div className="user-info">
              <span className="user-name">👤 {user?.name || user?.email}</span>
              <button 
                className="logout-btn"
                onClick={() => {
                  localStorage.removeItem('token');
                  window.location.reload();
                }}
              >
                登出
              </button>
            </div>
          </div>
        </div>
        
        <nav className="tab-nav">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="app-main">
        <ActiveComponent />
      </main>

      <footer className="app-footer">
        <p>💡 提示: 打开多个浏览器标签页来测试实时协作功能</p>
        <p>🔗 服务器地址: ws://localhost:8888/yjs/ws</p>
      </footer>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
