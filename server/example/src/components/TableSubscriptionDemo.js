import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useYjs } from '../yjs/useYjs';
import apiService from '../services/api';
import './TableSubscriptionDemo.css';

function TableSubscriptionDemo() {
  const { getAuthHeaders } = useAuth();
  const [spaces, setSpaces] = useState([]);
  const [bases, setBases] = useState([]);
  const [tables, setTables] = useState([]);
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [selectedBase, setSelectedBase] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [businessEvents, setBusinessEvents] = useState([]);

  // YJS 连接状态
  const [yjsConnected, setYjsConnected] = useState(false);
  const [yjsSynced, setYjsSynced] = useState(false);

  // 加载用户的空间列表
  const loadSpaces = async () => {
    try {
      setLoading(true);
      const data = await apiService.getSpaces();
      setSpaces(data.data || []);
    } catch (err) {
      setError('加载空间列表失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 加载指定空间下的Base列表
  const loadBases = async (spaceId) => {
    try {
      setLoading(true);
      const data = await apiService.getBases(spaceId);
      setBases(data.data || []);
    } catch (err) {
      setError('加载Base列表失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 加载指定Base下的表列表
  const loadTables = async (baseId) => {
    try {
      setLoading(true);
      const data = await apiService.getTables(baseId);
      setTables(data.data || []);
    } catch (err) {
      setError('加载表列表失败: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 初始化加载
  useEffect(() => {
    loadSpaces();
  }, []);

  // 处理空间选择
  const handleSpaceSelect = (space) => {
    setSelectedSpace(space);
    setSelectedBase(null);
    setSelectedTable(null);
    setBases([]);
    setTables([]);
    if (space) {
      loadBases(space.id);
    }
  };

  // 处理Base选择
  const handleBaseSelect = (base) => {
    setSelectedBase(base);
    setSelectedTable(null);
    setTables([]);
    if (base) {
      loadTables(base.id);
    }
  };

  // 处理表选择
  const handleTableSelect = (table) => {
    setSelectedTable(table);
  };

  // 使用YJS连接订阅选中的表
  const { doc, connected, synced, error: yjsError } = useYjs(
    selectedTable ? `table:${selectedTable.id}` : null,
    {
      userId: 'demo-user',
      serverUrl: 'ws://localhost:8888',
      endpoint: '/yjs/ws'
    }
  );

  // 监听YJS连接状态
  useEffect(() => {
    setYjsConnected(connected);
    setYjsSynced(synced);
  }, [connected, synced]);

  // 监听YJS错误
  useEffect(() => {
    if (yjsError) {
      setError('YJS连接错误: ' + yjsError);
    }
  }, [yjsError]);

  // 模拟业务事件（实际应该从YJS文档中获取）
  useEffect(() => {
    if (selectedTable && doc) {
      // 这里可以监听YJS文档中的业务事件
      // 实际实现中，业务事件会通过YJS同步过来
      const mockEvents = [
        {
          id: '1',
          type: 'table.update',
          tableId: selectedTable.id,
          data: { name: selectedTable.name },
          timestamp: Date.now(),
          user: 'demo-user'
        }
      ];
      setBusinessEvents(mockEvents);
    } else {
      setBusinessEvents([]);
    }
  }, [selectedTable, doc]);

  return (
    <div className="table-subscription-demo">
      <div className="demo-header">
        <h2>📊 表订阅演示</h2>
        <p>选择空间、Base和表，实时订阅表的业务事件</p>
      </div>

      {error && (
        <div className="error-banner">
          <span>❌ {error}</span>
          <button onClick={() => setError('')} className="close-btn">×</button>
        </div>
      )}

      <div className="demo-content">
        {/* 左侧：选择器 */}
        <div className="selector-panel">
          <div className="selector-section">
            <h3>🏢 选择空间</h3>
            <div className="selector-list">
              {loading ? (
                <div className="loading">加载中...</div>
              ) : spaces.length === 0 ? (
                <div className="empty">暂无空间</div>
              ) : (
                spaces.map(space => (
                  <div
                    key={space.id}
                    className={`selector-item ${selectedSpace?.id === space.id ? 'selected' : ''}`}
                    onClick={() => handleSpaceSelect(space)}
                  >
                    <div className="item-name">{space.name}</div>
                    <div className="item-description">{space.description || '无描述'}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {selectedSpace && (
            <div className="selector-section">
              <h3>📁 选择Base</h3>
              <div className="selector-list">
                {loading ? (
                  <div className="loading">加载中...</div>
                ) : bases.length === 0 ? (
                  <div className="empty">该空间下暂无Base</div>
                ) : (
                  bases.map(base => (
                    <div
                      key={base.id}
                      className={`selector-item ${selectedBase?.id === base.id ? 'selected' : ''}`}
                      onClick={() => handleBaseSelect(base)}
                    >
                      <div className="item-name">{base.name}</div>
                      <div className="item-description">{base.description || '无描述'}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {selectedBase && (
            <div className="selector-section">
              <h3>📋 选择表</h3>
              <div className="selector-list">
                {loading ? (
                  <div className="loading">加载中...</div>
                ) : tables.length === 0 ? (
                  <div className="empty">该Base下暂无表</div>
                ) : (
                  tables.map(table => (
                    <div
                      key={table.id}
                      className={`selector-item ${selectedTable?.id === table.id ? 'selected' : ''}`}
                      onClick={() => handleTableSelect(table)}
                    >
                      <div className="item-name">{table.name}</div>
                      <div className="item-description">{table.description || '无描述'}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* 右侧：订阅状态和事件 */}
        <div className="subscription-panel">
          <div className="status-section">
            <h3>🔗 订阅状态</h3>
            <div className="status-grid">
              <div className="status-item">
                <span className="status-label">YJS连接:</span>
                <span className={`status-value ${yjsConnected ? 'connected' : 'disconnected'}`}>
                  {yjsConnected ? '🟢 已连接' : '🔴 未连接'}
                </span>
              </div>
              <div className="status-item">
                <span className="status-label">同步状态:</span>
                <span className={`status-value ${yjsSynced ? 'synced' : 'syncing'}`}>
                  {yjsSynced ? '✅ 已同步' : '⏳ 同步中'}
                </span>
              </div>
              <div className="status-item">
                <span className="status-label">当前表:</span>
                <span className="status-value">
                  {selectedTable ? selectedTable.name : '未选择'}
                </span>
              </div>
              <div className="status-item">
                <span className="status-label">文档ID:</span>
                <span className="status-value">
                  {selectedTable ? `table:${selectedTable.id}` : '无'}
                </span>
              </div>
            </div>
          </div>

          <div className="events-section">
            <h3>📨 业务事件</h3>
            <div className="events-list">
              {businessEvents.length === 0 ? (
                <div className="empty">暂无业务事件</div>
              ) : (
                businessEvents.map(event => (
                  <div key={event.id} className="event-item">
                    <div className="event-header">
                      <span className="event-type">{event.type}</span>
                      <span className="event-time">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="event-data">
                      <pre>{JSON.stringify(event.data, null, 2)}</pre>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="actions-section">
            <h3>🛠️ 操作</h3>
            <div className="action-buttons">
              <button 
                className="btn btn-primary"
                onClick={() => window.open(window.location.href, '_blank')}
              >
                🔗 打开新标签页测试同步
              </button>
              <button 
                className="btn btn-info"
                onClick={() => {
                  setBusinessEvents([]);
                  setError('');
                }}
              >
                🧹 清空事件
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TableSubscriptionDemo;
