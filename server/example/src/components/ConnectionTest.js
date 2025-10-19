import React, { useState, useEffect, useRef } from 'react';
import { GoWebSocketProvider } from '../yjs/GoWebSocketProvider';
import './ConnectionTest.css';

function ConnectionTest() {
  const [connectionLog, setConnectionLog] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [serverUrl, setServerUrl] = useState('ws://localhost:8888');
  const [endpoint, setEndpoint] = useState('/yjs/ws');
  const [roomName, setRoomName] = useState('test-room');
  const [userId, setUserId] = useState(`test_user_${Math.random().toString(36).substr(2, 6)}`);
  const [messageCount, setMessageCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  
  const providerRef = useRef(null);
  const logRef = useRef(null);

  // 自动滚动到最新日志
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [connectionLog]);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setConnectionLog(prev => [...prev, { timestamp, message, type }]);
  };

  const connect = () => {
    if (providerRef.current) {
      disconnect();
    }

    setIsConnecting(true);
    addLog(`开始连接到服务器: ${serverUrl}${endpoint}`, 'info');
    addLog(`房间: ${roomName}, 用户: ${userId}`, 'info');

    try {
      const provider = new GoWebSocketProvider(roomName, {
        serverUrl,
        endpoint,
        userId,
        maxReconnectAttempts: 3,
        reconnectDelay: 1000
      });

      providerRef.current = provider;

      // 监听连接状态
      provider.on('status', (event) => {
        setIsConnected(event.status === 'connected');
        setIsConnecting(false);
        
        if (event.status === 'connected') {
          addLog('✅ 连接成功', 'success');
        } else {
          addLog('❌ 连接断开', 'error');
        }
      });

      // 监听同步状态
      provider.on('synced', (event) => {
        addLog('🔄 文档已同步', 'success');
      });

      // 监听错误
      provider.on('error', (error) => {
        setErrorCount(prev => prev + 1);
        addLog(`❌ 错误: ${error.message || error}`, 'error');
      });

      // 监听更新
      provider.on('update', (data) => {
        setMessageCount(prev => prev + 1);
        addLog(`📝 收到更新: ${JSON.stringify(data).substring(0, 100)}...`, 'info');
      });

      // 监听感知
      provider.on('awareness', (data) => {
        addLog(`👁️ 收到感知信息: ${JSON.stringify(data).substring(0, 100)}...`, 'info');
      });

    } catch (error) {
      setIsConnecting(false);
      setErrorCount(prev => prev + 1);
      addLog(`❌ 连接失败: ${error.message}`, 'error');
    }
  };

  const disconnect = () => {
    if (providerRef.current) {
      providerRef.current.destroy();
      providerRef.current = null;
      setIsConnected(false);
      setIsConnecting(false);
      addLog('🔌 主动断开连接', 'info');
    }
  };

  const sendTestMessage = () => {
    if (providerRef.current && isConnected) {
      const testMessage = {
        type: 'test',
        timestamp: Date.now(),
        message: '这是一条测试消息'
      };
      
      providerRef.current.sendMessage(testMessage);
      addLog(`📤 发送测试消息: ${JSON.stringify(testMessage)}`, 'info');
    } else {
      addLog('❌ 无法发送消息：未连接', 'error');
    }
  };

  const sendTestUpdate = () => {
    if (providerRef.current && isConnected) {
      const doc = providerRef.current.getDoc();
      const yText = doc.getText('test');
      yText.insert(0, `测试更新 ${Date.now()}\n`);
      addLog('📝 发送测试更新到文档', 'info');
    } else {
      addLog('❌ 无法发送更新：未连接', 'error');
    }
  };

  const sendTestAwareness = () => {
    if (providerRef.current && isConnected) {
      const awareness = {
        cursor: { x: Math.random() * 100, y: Math.random() * 100 },
        selection: { start: 0, end: 10 },
        user: userId
      };
      
      providerRef.current.sendAwareness(awareness);
      addLog(`👁️ 发送感知信息: ${JSON.stringify(awareness)}`, 'info');
    } else {
      addLog('❌ 无法发送感知信息：未连接', 'error');
    }
  };

  const clearLog = () => {
    setConnectionLog([]);
    setMessageCount(0);
    setErrorCount(0);
  };

  const exportLog = () => {
    const logText = connectionLog.map(log => 
      `[${log.timestamp}] ${log.type.toUpperCase()}: ${log.message}`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yjs-connection-test-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="connection-test">
      <div className="test-header">
        <h2>🔌 YJS 连接测试</h2>
        <p>测试与 Go 服务器的 YJS WebSocket 连接</p>
      </div>

      {/* 连接配置 */}
      <div className="config-section">
        <h3>连接配置</h3>
        <div className="config-grid">
          <div className="config-item">
            <label>服务器地址:</label>
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="ws://localhost:8888"
              disabled={isConnected || isConnecting}
            />
          </div>
          <div className="config-item">
            <label>端点路径:</label>
            <input
              type="text"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="/yjs/ws"
              disabled={isConnected || isConnecting}
            />
          </div>
          <div className="config-item">
            <label>房间名称:</label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="test-room"
              disabled={isConnected || isConnecting}
            />
          </div>
          <div className="config-item">
            <label>用户ID:</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="user_id"
              disabled={isConnected || isConnecting}
            />
          </div>
        </div>
      </div>

      {/* 连接控制 */}
      <div className="control-section">
        <h3>连接控制</h3>
        <div className="control-buttons">
          <button
            onClick={connect}
            disabled={isConnected || isConnecting}
            className="btn btn-primary"
          >
            {isConnecting ? '🔄 连接中...' : '🔗 连接'}
          </button>
          <button
            onClick={disconnect}
            disabled={!isConnected}
            className="btn btn-danger"
          >
            🔌 断开连接
          </button>
        </div>
      </div>

      {/* 测试操作 */}
      <div className="test-section">
        <h3>测试操作</h3>
        <div className="test-buttons">
          <button
            onClick={sendTestMessage}
            disabled={!isConnected}
            className="btn btn-info"
          >
            📤 发送测试消息
          </button>
          <button
            onClick={sendTestUpdate}
            disabled={!isConnected}
            className="btn btn-info"
          >
            📝 发送测试更新
          </button>
          <button
            onClick={sendTestAwareness}
            disabled={!isConnected}
            className="btn btn-info"
          >
            👁️ 发送感知信息
          </button>
        </div>
      </div>

      {/* 连接状态 */}
      <div className="status-section">
        <h3>连接状态</h3>
        <div className="status-grid">
          <div className="status-item">
            <span className="status-label">连接状态:</span>
            <span className={`status-value ${isConnected ? 'connected' : 'disconnected'}`}>
              {isConnected ? '🟢 已连接' : '🔴 未连接'}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">消息计数:</span>
            <span className="status-value">{messageCount}</span>
          </div>
          <div className="status-item">
            <span className="status-label">错误计数:</span>
            <span className="status-value">{errorCount}</span>
          </div>
          <div className="status-item">
            <span className="status-label">日志条目:</span>
            <span className="status-value">{connectionLog.length}</span>
          </div>
        </div>
      </div>

      {/* 连接日志 */}
      <div className="log-section">
        <div className="log-header">
          <h3>连接日志</h3>
          <div className="log-controls">
            <button onClick={clearLog} className="btn btn-warning btn-sm">
              🧹 清空日志
            </button>
            <button onClick={exportLog} className="btn btn-info btn-sm">
              📥 导出日志
            </button>
          </div>
        </div>
        <div className="log-container" ref={logRef}>
          {connectionLog.length === 0 ? (
            <div className="log-empty">暂无日志记录</div>
          ) : (
            connectionLog.map((log, index) => (
              <div key={index} className={`log-entry ${log.type}`}>
                <span className="log-timestamp">[{log.timestamp}]</span>
                <span className="log-message">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default ConnectionTest;
