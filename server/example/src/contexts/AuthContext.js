import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/api';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // 检查本地存储的token
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // 验证token并获取用户信息
      validateToken(token);
    } else {
      setLoading(false);
    }
  }, []);

  const validateToken = async (token) => {
    try {
      const data = await apiService.getCurrentUser();
      setUser(data.data);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Token验证失败:', error);
      localStorage.removeItem('token');
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const data = await apiService.login(email, password);
      const { user, access_token } = data.data;
      localStorage.setItem('token', access_token);
      setUser(user);
      setIsAuthenticated(true);
      return { success: true, user };
    } catch (error) {
      console.error('登录错误:', error);
      return { 
        success: false, 
        error: error.message || '网络错误，请检查服务器连接' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
  };

  const getAuthHeaders = () => {
    return apiService.getAuthHeaders();
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    getAuthHeaders
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
