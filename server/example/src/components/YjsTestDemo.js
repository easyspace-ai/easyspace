import React, { useState, useEffect } from 'react';
import { useYjsText, useYjsArray, useYjsMap } from '../yjs/useYjs';
import './YjsTestDemo.css';

function YjsTestDemo() {
  const [roomName, setRoomName] = useState('demo-room');
  const [userName, setUserName] = useState(`用户_${Math.random().toString(36).substr(2, 6)}`);
  
  // 使用 YJS Hooks
  const {
    text,
    textLength,
    updateText,
    connected: textConnected,
    synced: textSynced,
    error: textError
  } = useYjsText(roomName, 'text', { userId: userName });

  const {
    array,
    push: pushArray,
    delete: deleteArray,
    clear: clearArray,
    connected: arrayConnected,
    synced: arraySynced,
    error: arrayError
  } = useYjsArray(roomName, 'array', { userId: userName });

  const {
    map,
    set: setMap,
    delete: deleteMap,
    clear: clearMap,
    connected: mapConnected,
    synced: mapSynced,
    error: mapError
  } = useYjsMap(roomName, 'map', { userId: userName });

  // 计算连接状态
  const connected = textConnected && arrayConnected && mapConnected;
  const synced = textSynced && arraySynced && mapSynced;
  const error = textError || arrayError || mapError;

  // 添加一些初始数据
  useEffect(() => {
    if (synced && textLength === 0) {
      updateText('欢迎使用 YJS 实时协作演示！\n\n这是一个连接到 Go 服务器的实时协作编辑演示。\n\n试试在多个浏览器标签页中同时编辑，观察实时同步效果！\n\n功能特性：\n- 实时文本协作编辑\n- 实时数组操作\n- 实时键值对操作\n- 自动冲突解决\n- 离线同步支持');
    }
    
    if (synced && array.length === 0) {
      pushArray('示例项目 1', '示例项目 2', '示例项目 3');
    }
    
    if (synced && Object.keys(map).length === 0) {
      setMap('用户名', userName);
      setMap('状态', '在线');
      setMap('服务器', 'Go WebSocket');
      setMap('版本', '1.0.0');
      setMap('连接时间', new Date().toLocaleString());
    }
  }, [synced, textLength, array.length, Object.keys(map).length, updateText, pushArray, setMap, userName]);

  const handleTextChange = (e) => {
    updateText(e.target.value);
  };

  const addArrayItem = () => {
    const newItem = `新项目 ${Date.now()}`;
    pushArray(newItem);
  };

  const removeArrayItem = (index) => {
    deleteArray(index, 1);
  };

  const addMapItem = () => {
    const newKey = `键_${Date.now()}`;
    const newValue = `值_${Math.floor(Math.random() * 100)}`;
    setMap(newKey, newValue);
  };

  const removeMapItem = (key) => {
    deleteMap(key);
  };

  const clearAllData = () => {
    updateText('');
    clearArray();
    clearMap();
  };

  const openNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  return (
    <div className="yjs-demo">
      {/* 状态栏 */}
      <div className="status-bar">
        <div className="status-info">
          <div className={`status-indicator ${connected ? 'connected' : 'disconnected'}`}>
            {connected ? '🟢 已连接' : '🔴 连接中...'}
          </div>
          <div className="sync-status">
            {synced ? '✅ 已同步' : '⏳ 同步中...'}
          </div>
          <div className="user-info">
            用户: {userName} | 房间: {roomName}
          </div>
        </div>
        
        <div className="room-controls">
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="房间名称"
            className="room-input"
          />
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="用户名"
            className="user-input"
          />
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span>❌ 错误: {error}</span>
        </div>
      )}

      <div className="demo-grid">
        {/* 文本编辑器 */}
        <div className="demo-section">
          <div className="section-header">
            <h2>📝 文本协作编辑</h2>
            <div className="section-stats">
              字符数: {textLength} | 行数: {text.split('\n').length}
            </div>
          </div>
          <div className="text-editor">
            <textarea
              value={text}
              onChange={handleTextChange}
              placeholder="在这里输入文本，支持实时协作编辑..."
              rows={12}
              disabled={!connected}
            />
          </div>
        </div>

        {/* 数组编辑器 */}
        <div className="demo-section">
          <div className="section-header">
            <h2>📋 数组协作编辑</h2>
            <div className="section-stats">
              项目数: {array.length}
            </div>
          </div>
          <div className="array-editor">
            <div className="array-controls">
              <button 
                onClick={addArrayItem} 
                className="btn btn-primary"
                disabled={!connected}
              >
                ➕ 添加项目
              </button>
            </div>
            <div className="array-list">
              {array.map((item, index) => (
                <div key={index} className="array-item">
                  <span className="item-index">{index + 1}.</span>
                  <span className="item-content">{item}</span>
                  <button 
                    onClick={() => removeArrayItem(index)} 
                    className="btn btn-danger btn-sm"
                    disabled={!connected}
                  >
                    🗑️
                  </button>
                </div>
              ))}
              {array.length === 0 && (
                <div className="empty-state">暂无项目</div>
              )}
            </div>
          </div>
        </div>

        {/* Map 编辑器 */}
        <div className="demo-section">
          <div className="section-header">
            <h2>🗃️ 键值对协作编辑</h2>
            <div className="section-stats">
              键值对数: {Object.keys(map).length}
            </div>
          </div>
          <div className="map-editor">
            <div className="map-controls">
              <button 
                onClick={addMapItem} 
                className="btn btn-primary"
                disabled={!connected}
              >
                ➕ 添加键值对
              </button>
            </div>
            <div className="map-list">
              {Object.entries(map).map(([key, value]) => (
                <div key={key} className="map-item">
                  <span className="map-key">{key}:</span>
                  <span className="map-value">{value}</span>
                  <button 
                    onClick={() => removeMapItem(key)} 
                    className="btn btn-danger btn-sm"
                    disabled={!connected}
                  >
                    🗑️
                  </button>
                </div>
              ))}
              {Object.keys(map).length === 0 && (
                <div className="empty-state">暂无键值对</div>
              )}
            </div>
          </div>
        </div>

        {/* 操作控制 */}
        <div className="demo-section controls-section">
          <div className="section-header">
            <h2>🛠️ 操作控制</h2>
          </div>
          <div className="controls">
            <button 
              onClick={clearAllData} 
              className="btn btn-warning"
              disabled={!connected}
            >
              🧹 清空所有数据
            </button>
            <button 
              onClick={openNewTab} 
              className="btn btn-info"
            >
              🔗 打开新标签页测试同步
            </button>
          </div>
        </div>

        {/* 数据统计 */}
        <div className="demo-section stats-section">
          <div className="section-header">
            <h2>📊 数据统计</h2>
          </div>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-label">文本长度</div>
              <div className="stat-value">{textLength}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">数组项目</div>
              <div className="stat-value">{array.length}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">键值对数</div>
              <div className="stat-value">{Object.keys(map).length}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">连接状态</div>
              <div className="stat-value">{connected ? '已连接' : '未连接'}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">同步状态</div>
              <div className="stat-value">{synced ? '已同步' : '同步中'}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">用户ID</div>
              <div className="stat-value">{userName}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default YjsTestDemo;
