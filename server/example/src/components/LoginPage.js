import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import './LoginPage.css';

function LoginPage() {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    email: 'test@example.com',
    password: 'Test123456'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(formData.email, formData.password);
    
    if (!result.success) {
      setError(result.error);
    }
    
    setLoading(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>🚀 YJS 服务器测试演示</h1>
          <p>请登录以访问实时协作功能</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">邮箱地址</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="请输入邮箱地址"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">密码</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="请输入密码"
              required
              disabled={loading}
            />
          </div>

          {error && (
            <div className="error-message">
              ❌ {error}
            </div>
          )}

          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        <div className="login-info">
          <h3>默认登录信息</h3>
          <div className="default-credentials">
            <p><strong>邮箱:</strong> test@example.com</p>
            <p><strong>密码:</strong> Test123456</p>
          </div>
          <div className="features">
            <h4>功能特性</h4>
            <ul>
              <li>✅ 用户认证和授权</li>
              <li>✅ 空间和Base管理</li>
              <li>✅ 表订阅和实时同步</li>
              <li>✅ YJS 实时协作编辑</li>
              <li>✅ 业务事件广播</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
