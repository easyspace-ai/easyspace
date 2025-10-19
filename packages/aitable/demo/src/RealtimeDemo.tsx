/**
 * ShareDB 实时协作演示组件
 * 展示如何在演示中集成实时数据变更响应
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSDK } from './App';
import { SimpleShareDBClient } from './SimpleShareDBClient';

interface RealtimeStatus {
  connected: boolean;
  subscribed: boolean;
  lastUpdate: string | null;
  updateCount: number;
}

interface RealtimeDemoProps {
  tableId: string;
  recordId?: string;
}

export function RealtimeDemo({ tableId, recordId }: RealtimeDemoProps) {
  const { sdk } = useSDK();
  const [simpleShareDB, setSimpleShareDB] = useState<SimpleShareDBClient | null>(null);
  const [status, setStatus] = useState<RealtimeStatus>({
    connected: false,
    subscribed: false,
    lastUpdate: null,
    updateCount: 0,
  });
  const [realtimeData, setRealtimeData] = useState<any>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 初始化简化的 ShareDB 客户端
  useEffect(() => {
    if (!sdk) return;

    const wsClient = sdk.getWebSocketClient();
    if (wsClient) {
      const simpleClient = new SimpleShareDBClient(wsClient);
      setSimpleShareDB(simpleClient);
    }
  }, [sdk]);

  // 检查 ShareDB 连接状态
  useEffect(() => {
    if (!simpleShareDB) return;

    const checkConnection = () => {
      const isAvailable = simpleShareDB.isAvailable();
      const connectionState = simpleShareDB.getConnectionState();

      setStatus((prev) => ({
        ...prev,
        connected: isAvailable && connectionState === 'connected',
      }));
    };

    checkConnection();
    const interval = setInterval(checkConnection, 2000);

    return () => clearInterval(interval);
  }, [simpleShareDB]);

  // 订阅记录变更
  const subscribeToRecord = useCallback(async () => {
    if (!simpleShareDB || !recordId || isSubscribing) return;

    try {
      setIsSubscribing(true);
      setError(null);

      console.log('🔌 开始订阅记录变更...', { tableId, recordId });

      // 检查 ShareDB 是否可用
      if (!simpleShareDB.isAvailable()) {
        throw new Error('ShareDB 不可用，请检查 WebSocket 连接');
      }

      // 获取文档并订阅
      const doc = simpleShareDB.getDocument(`record_${tableId}`, recordId);
      const unsubscribe = doc.subscribe((ops) => {
        console.log('📨 收到实时更新:', ops);
        setRealtimeData(ops);
        setStatus((prev) => ({
          ...prev,
          lastUpdate: new Date().toLocaleTimeString(),
          updateCount: prev.updateCount + 1,
        }));
      });

      setStatus((prev) => ({
        ...prev,
        subscribed: true,
      }));

      console.log('✅ 订阅成功');

      // 返回清理函数
      return () => {
        console.log('🧹 取消订阅');
        unsubscribe();
        setStatus((prev) => ({
          ...prev,
          subscribed: false,
        }));
      };
    } catch (err: any) {
      console.error('❌ 订阅失败:', err);
      setError(err.message || '订阅失败');
    } finally {
      setIsSubscribing(false);
    }
  }, [simpleShareDB, tableId, recordId, isSubscribing]);

  // 实时更新记录字段
  const updateRecordField = useCallback(
    async (fieldId: string, value: any) => {
      if (!recordId) return;

      try {
        console.log('📝 实时更新字段:', { fieldId, value });

        if (simpleShareDB && simpleShareDB.isAvailable()) {
          // 使用简化的 ShareDB 实时更新
          const doc = simpleShareDB.getDocument(`record_${tableId}`, recordId);
          await doc.submitOp([
            {
              p: ['fields', fieldId],
              oi: value,
            },
          ]);
          console.log('✅ ShareDB 实时更新成功');
        } else if (sdk) {
          // 回退到传统 API
          await sdk.updateRecord(tableId, recordId, {
            data: { [fieldId]: value },
            // 注意：这里没有版本号，可能会导致乐观锁冲突
            // 在实际应用中，应该从当前记录中获取版本号
          });
          console.log('✅ 传统 API 更新成功');
        }
      } catch (err: any) {
        console.error('❌ 更新失败:', err);
        setError(err.message || '更新失败');
      }
    },
    [sdk, simpleShareDB, tableId, recordId]
  );

  // 批量实时更新
  const batchUpdateFields = useCallback(
    async (fields: Record<string, any>) => {
      if (!recordId) return;

      try {
        console.log('📝 批量实时更新:', fields);

        if (simpleShareDB && simpleShareDB.isAvailable()) {
          // 使用简化的 ShareDB 批量更新
          const doc = simpleShareDB.getDocument(`record_${tableId}`, recordId);
          const ops = Object.entries(fields).map(([fieldId, value]) => ({
            p: ['fields', fieldId],
            oi: value,
          }));
          await doc.submitOp(ops);
          console.log('✅ ShareDB 批量更新成功');
        } else if (sdk) {
          // 回退到传统 API
          await sdk.updateRecord(tableId, recordId, {
            data: fields,
            // 注意：这里没有版本号，可能会导致乐观锁冲突
            // 在实际应用中，应该从当前记录中获取版本号
          });
          console.log('✅ 传统 API 批量更新成功');
        }
      } catch (err: any) {
        console.error('❌ 批量更新失败:', err);
        setError(err.message || '批量更新失败');
      }
    },
    [sdk, simpleShareDB, tableId, recordId]
  );

  return (
    <div
      style={{
        padding: '20px',
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        margin: '20px',
      }}
    >
      <h2
        style={{
          fontSize: '20px',
          fontWeight: 'bold',
          marginBottom: '16px',
          color: '#1a202c',
        }}
      >
        🔄 ShareDB 实时协作演示
      </h2>

      {/* 连接状态 */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '20px',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            padding: '8px 12px',
            background: status.connected ? '#d4edda' : '#f8d7da',
            color: status.connected ? '#155724' : '#721c24',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          {status.connected ? '🟢 ShareDB 已连接' : '🔴 ShareDB 未连接'}
        </div>

        <div
          style={{
            padding: '8px 12px',
            background: status.subscribed ? '#d4edda' : '#f8d7da',
            color: status.subscribed ? '#155724' : '#721c24',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          {status.subscribed ? '🟢 已订阅变更' : '🔴 未订阅变更'}
        </div>

        {status.lastUpdate && (
          <div
            style={{
              padding: '8px 12px',
              background: '#e2e8f0',
              color: '#4a5568',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          >
            📊 更新次数: {status.updateCount} | 最后更新: {status.lastUpdate}
          </div>
        )}
      </div>

      {/* 错误信息 */}
      {error && (
        <div
          style={{
            padding: '12px',
            background: '#f8d7da',
            color: '#721c24',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px',
          }}
        >
          ❌ {error}
        </div>
      )}

      {/* 操作按钮 */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '20px',
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={subscribeToRecord}
          disabled={!recordId || isSubscribing || status.subscribed}
          style={{
            padding: '10px 16px',
            background: status.subscribed ? '#cbd5e0' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: status.subscribed ? 'not-allowed' : 'pointer',
            opacity: status.subscribed ? 0.6 : 1,
          }}
        >
          {isSubscribing ? '订阅中...' : status.subscribed ? '已订阅' : '订阅记录变更'}
        </button>

        <button
          onClick={() => updateRecordField('name', `实时更新_${Date.now()}`)}
          disabled={!recordId}
          style={{
            padding: '10px 16px',
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
          }}
        >
          更新名称字段
        </button>

        <button
          onClick={() => updateRecordField('description', `描述更新_${Date.now()}`)}
          disabled={!recordId}
          style={{
            padding: '10px 16px',
            background: '#f59e0b',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
          }}
        >
          更新描述字段
        </button>

        <button
          onClick={() =>
            batchUpdateFields({
              name: `批量更新_${Date.now()}`,
              description: `批量描述_${Date.now()}`,
              status: 'updated',
            })
          }
          disabled={!recordId}
          style={{
            padding: '10px 16px',
            background: '#8b5cf6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
          }}
        >
          批量更新字段
        </button>
      </div>

      {/* 实时数据显示 */}
      {realtimeData && (
        <div
          style={{
            padding: '16px',
            background: '#f7fafc',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
          }}
        >
          <h3
            style={{
              fontSize: '16px',
              fontWeight: '600',
              marginBottom: '12px',
              color: '#2d3748',
            }}
          >
            📨 最新实时更新
          </h3>
          <pre
            style={{
              fontSize: '12px',
              color: '#4a5568',
              background: 'white',
              padding: '12px',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              overflow: 'auto',
              maxHeight: '200px',
            }}
          >
            {JSON.stringify(realtimeData, null, 2)}
          </pre>
        </div>
      )}

      {/* 使用说明 */}
      <div
        style={{
          marginTop: '20px',
          padding: '16px',
          background: '#edf2f7',
          borderRadius: '8px',
          fontSize: '14px',
          color: '#4a5568',
        }}
      >
        <h4 style={{ fontWeight: '600', marginBottom: '8px' }}>💡 使用说明：</h4>
        <ul style={{ margin: 0, paddingLeft: '20px' }}>
          <li>确保已登录并连接到后端服务</li>
          <li>ShareDB 连接状态显示实时 WebSocket 连接情况</li>
          <li>点击"订阅记录变更"开始监听数据变化</li>
          <li>使用更新按钮测试实时数据同步</li>
          <li>在其他浏览器标签页中打开相同页面测试多用户协作</li>
        </ul>
      </div>
    </div>
  );
}
