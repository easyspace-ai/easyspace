/**
 * useRealtimeSync - 实时同步 Hook
 *
 * 功能：
 * 1. 监听表结构变更（字段添加/删除/修改）
 * 2. 监听数据变更（记录添加/更新/删除）
 * 3. 自动更新本地状态
 * 4. 提供手动刷新功能
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { LuckDB } from '@luckdb/sdk';

interface RealtimeSyncState {
  fields: any[];
  records: any[];
  isLoading: boolean;
  error: string | null;
  lastSyncTime: Date | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
}

interface UseRealtimeSyncOptions {
  tableId: string;
  baseId: string;
  sdk: LuckDB | null;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useRealtimeSync({
  tableId,
  baseId,
  sdk,
  autoRefresh = true,
  refreshInterval = 5000,
}: UseRealtimeSyncOptions) {
  const [state, setState] = useState<RealtimeSyncState>({
    fields: [],
    records: [],
    isLoading: true,
    error: null,
    lastSyncTime: null,
    connectionStatus: 'disconnected',
  });

  const refreshTimeoutRef = useRef<NodeJS.Timeout>();
  const isInitializedRef = useRef(false);

  // 获取字段列表
  const fetchFields = useCallback(async () => {
    if (!sdk || !tableId) return;

    try {
      console.log('🔄 获取字段列表...');
      const fields = await sdk.listFields({ tableId });
      setState((prev) => ({
        ...prev,
        fields: fields || [],
        error: null,
      }));
      console.log('✅ 字段列表更新:', fields?.length || 0, '个字段');
    } catch (error) {
      console.error('❌ 获取字段列表失败:', error);
      setState((prev) => ({
        ...prev,
        error: `获取字段失败: ${(error as Error).message}`,
      }));
    }
  }, [sdk, tableId]);

  // 获取记录列表
  const fetchRecords = useCallback(async () => {
    if (!sdk || !tableId) return;

    try {
      console.log('🔄 获取记录列表...');
      const recordsData = await sdk.listRecords({ tableId });

      // 处理多种数据结构
      let records: any[] = [];
      if (recordsData) {
        const data: any = recordsData;
        if (Array.isArray(data)) {
          records = data;
        } else if (data.data) {
          if (Array.isArray(data.data)) {
            records = data.data;
          } else if (data.data.list) {
            records = data.data.list;
          }
        } else if (data.list) {
          records = data.list;
        }
      }

      setState((prev) => ({
        ...prev,
        records,
        error: null,
        lastSyncTime: new Date(),
      }));
      console.log('✅ 记录列表更新:', records.length, '条记录');
    } catch (error) {
      console.error('❌ 获取记录列表失败:', error);
      setState((prev) => ({
        ...prev,
        error: `获取记录失败: ${(error as Error).message}`,
      }));
    }
  }, [sdk, tableId]);

  // 手动刷新所有数据
  const refresh = useCallback(async () => {
    if (!sdk || !tableId) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      await Promise.all([fetchFields(), fetchRecords()]);
    } catch (error) {
      console.error('❌ 刷新数据失败:', error);
      setState((prev) => ({
        ...prev,
        error: `刷新失败: ${(error as Error).message}`,
      }));
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [sdk, tableId, fetchFields, fetchRecords]);

  // 设置 WebSocket 监听器
  const setupWebSocketListeners = useCallback(() => {
    if (!sdk) {
      console.warn('⚠️ SDK 未初始化');
      return;
    }

    const wsClient = sdk.getWebSocketClient();
    if (!wsClient) {
      console.warn('⚠️ WebSocket 客户端未初始化');
      return;
    }

    console.log('🔌 设置 WebSocket 监听器...', {
      wsClient,
      connectionState: wsClient.getConnectionState(),
      config: wsClient.config,
    });

    // 监听连接状态变化
    wsClient.on('connected', () => {
      console.log('✅ WebSocket 已连接');
      setState((prev) => ({ ...prev, connectionStatus: 'connected' }));
    });

    wsClient.on('disconnected', () => {
      console.log('⚠️ WebSocket 已断开');
      setState((prev) => ({ ...prev, connectionStatus: 'disconnected' }));
    });

    wsClient.on('error', (error: any) => {
      console.error('❌ WebSocket 错误:', error);
      setState((prev) => ({ ...prev, error: `WebSocket 错误: ${error.message}` }));
    });

    // 检查当前连接状态
    const currentState = wsClient.getConnectionState();
    console.log('🔍 当前 WebSocket 连接状态:', currentState);

    // 如果未连接，尝试连接
    if (currentState === 'disconnected') {
      console.log('🔄 尝试连接 WebSocket...');
      wsClient.connect().catch((error: any) => {
        console.error('❌ WebSocket 连接失败:', error);
        setState((prev) => ({ ...prev, error: `WebSocket 连接失败: ${error.message}` }));
      });
    }

    // 监听 WebSocket 操作事件 - 根据操作类型处理不同的数据更新
    wsClient.on('op', (message: any) => {
      console.log('📨 收到 WebSocket 操作事件:', message);

      if (!message.data || !message.data.type) {
        console.warn('⚠️ 无效的操作消息格式:', message);
        return;
      }

      const operation = message.data;
      const operationType = operation.type;
      const operationTableId = operation.table_id;

      // 只处理当前表的事件
      if (operationTableId !== tableId) {
        return;
      }

      console.log(`🔄 处理操作: ${operationType}`, operation);

      switch (operationType) {
        case 'field_create':
          console.log('🆕 字段已创建:', operation.data);
          setState((prev) => ({
            ...prev,
            fields: [...prev.fields, operation.data],
            lastSyncTime: new Date(),
          }));
          break;

        case 'field_update':
          console.log('🔄 字段已更新:', operation.data);
          setState((prev) => ({
            ...prev,
            fields: prev.fields.map((field: any) =>
              field.id === operation.data.id ? { ...field, ...operation.data } : field
            ),
            lastSyncTime: new Date(),
          }));
          break;

        case 'field_delete':
          console.log('🗑️ 字段已删除:', operation.data);
          setState((prev) => ({
            ...prev,
            fields: prev.fields.filter((field: any) => field.id !== operation.data.field_id),
            lastSyncTime: new Date(),
          }));
          break;

        case 'record_create':
          console.log('🆕 记录已创建:', operation.data);
          setState((prev) => ({
            ...prev,
            records: [...prev.records, operation.data],
            lastSyncTime: new Date(),
          }));
          break;

        case 'record_update':
          console.log('🔄 记录已更新:', operation.data);
          setState((prev) => ({
            ...prev,
            records: prev.records.map((record: any) =>
              record.id === operation.data.record_id ? { ...record, ...operation.data } : record
            ),
            lastSyncTime: new Date(),
          }));
          break;

        case 'record_delete':
          console.log('🗑️ 记录已删除:', operation.data);
          setState((prev) => ({
            ...prev,
            records: prev.records.filter((record: any) => record.id !== operation.data.record_id),
            lastSyncTime: new Date(),
          }));
          break;

        default:
          console.log('ℹ️ 未处理的操作类型:', operationType);
      }
    });

    // 监听 ShareDB 事件
    const sharedbClient = sdk.getShareDBClient();
    if (sharedbClient) {
      console.log('🔌 设置 ShareDB 监听器...');

      sharedbClient.on('connected', () => {
        console.log('✅ ShareDB 已连接');
        setState((prev) => ({ ...prev, connectionStatus: 'connected' }));
      });

      sharedbClient.on('disconnected', () => {
        console.log('⚠️ ShareDB 已断开');
        setState((prev) => ({ ...prev, connectionStatus: 'disconnected' }));
      });

      // 监听文档变更 - 直接更新本地状态，不重新获取数据
      sharedbClient.on('document.changed', (data: any) => {
        console.log('📄 ShareDB 文档已变更:', data);
        // 根据文档类型直接更新对应状态
        if (data.collection?.includes('field')) {
          console.log('🔄 ShareDB 字段文档变更，更新本地字段状态');
          setState((prev) => ({
            ...prev,
            lastSyncTime: new Date(),
          }));
        } else if (data.collection?.includes('record')) {
          console.log('🔄 ShareDB 记录文档变更，更新本地记录状态');
          setState((prev) => ({
            ...prev,
            lastSyncTime: new Date(),
          }));
        }
      });
    }

    return () => {
      console.log('🧹 清理 WebSocket 监听器');
      wsClient.removeAllListeners();
      if (sharedbClient) {
        sharedbClient.removeAllListeners();
      }
    };
  }, [sdk, fetchFields, fetchRecords]);

  // 初始化数据
  useEffect(() => {
    if (!sdk || !tableId || isInitializedRef.current) return;

    console.log('🚀 初始化实时同步...');
    isInitializedRef.current = true;

    const init = async () => {
      setState((prev) => ({ ...prev, isLoading: true, connectionStatus: 'connecting' }));

      try {
        // 设置 WebSocket 监听器
        const cleanup = setupWebSocketListeners();

        // 初始加载数据
        await Promise.all([fetchFields(), fetchRecords()]);

        setState((prev) => ({ ...prev, isLoading: false }));

        return cleanup;
      } catch (error) {
        console.error('❌ 初始化失败:', error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: `初始化失败: ${(error as Error).message}`,
        }));
      }
    };

    init();
  }, [sdk, tableId, setupWebSocketListeners, fetchFields, fetchRecords]);

  // 自动刷新 - 仅在 WebSocket 断开时作为备用方案
  useEffect(() => {
    if (!autoRefresh || !sdk || !tableId) return;

    const scheduleRefresh = () => {
      refreshTimeoutRef.current = setTimeout(() => {
        // 只有在 WebSocket 断开时才自动刷新
        if (state.connectionStatus === 'disconnected') {
          console.log('⏰ WebSocket 断开，使用自动刷新作为备用方案...');
          refresh();
        }
        scheduleRefresh(); // 递归调度下次刷新
      }, refreshInterval);
    };

    scheduleRefresh();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [autoRefresh, sdk, tableId, refresh, refreshInterval, state.connectionStatus]);

  // 清理
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      isInitializedRef.current = false;
    };
  }, []);

  return {
    ...state,
    refresh,
    fetchFields,
    fetchRecords,
  };
}
