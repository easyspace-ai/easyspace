/**
 * useYjsRealtimeSync - 基于YJS的实时同步 Hook
 *
 * 功能：
 * 1. 使用YJS进行实时协作同步
 * 2. 监听表结构变更（字段添加/删除/修改）
 * 3. 监听数据变更（记录添加/更新/删除）
 * 4. 自动更新本地状态
 * 5. 提供手动刷新功能
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { LuckDB } from '@luckdb/sdk';

interface YjsRealtimeSyncState {
  fields: any[];
  records: any[];
  isLoading: boolean;
  error: string | null;
  lastSyncTime: Date | null;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
  yjsConnectionStatus: 'connecting' | 'connected' | 'disconnected';
}

interface UseYjsRealtimeSyncOptions {
  tableId: string;
  baseId: string;
  sdk: LuckDB | null;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useYjsRealtimeSync({
  tableId,
  baseId,
  sdk,
  autoRefresh = true,
  refreshInterval = 5000,
}: UseYjsRealtimeSyncOptions) {
  const [state, setState] = useState<YjsRealtimeSyncState>({
    fields: [],
    records: [],
    isLoading: true,
    error: null,
    lastSyncTime: null,
    connectionStatus: 'disconnected',
    yjsConnectionStatus: 'disconnected',
  });

  const refreshTimeoutRef = useRef<NodeJS.Timeout>();
  const isInitializedRef = useRef(false);
  const yjsDocumentRef = useRef<any>(null);

  // 获取字段列表
  const fetchFields = useCallback(async () => {
    if (!sdk || !tableId) return;

    try {
      console.log('🔄 [YJS] 获取字段列表...');
      const fields = await sdk.listFields({ tableId });
      setState((prev) => ({
        ...prev,
        fields: fields || [],
        error: null,
      }));
      console.log('✅ [YJS] 字段列表更新:', fields?.length || 0, '个字段');
    } catch (error) {
      console.error('❌ [YJS] 获取字段列表失败:', error);
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
      console.log('🔄 [YJS] 获取记录列表...');
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
      console.log('✅ [YJS] 记录列表更新:', records.length, '条记录');
    } catch (error) {
      console.error('❌ [YJS] 获取记录列表失败:', error);
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
      console.error('❌ [YJS] 刷新数据失败:', error);
      setState((prev) => ({
        ...prev,
        error: `刷新失败: ${(error as Error).message}`,
      }));
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [sdk, tableId, fetchFields, fetchRecords]);

  // 设置 YJS 监听器
  const setupYjsListeners = useCallback(() => {
    if (!sdk) {
      console.warn('⚠️ [YJS] SDK 未初始化');
      return;
    }

    const yjsClient = sdk.getYjsClient();
    if (!yjsClient) {
      console.warn('⚠️ [YJS] YJS 客户端未初始化');
      return;
    }

    console.log('🔌 [YJS] 设置 YJS 监听器...', {
      yjsClient,
      connectionState: yjsClient.getConnectionState(),
    });

    // 监听 YJS 连接状态变化
    yjsClient.on('connected', () => {
      console.log('✅ [YJS] YJS 已连接');
      setState((prev) => ({ ...prev, yjsConnectionStatus: 'connected' }));
    });

    yjsClient.on('disconnected', () => {
      console.log('⚠️ [YJS] YJS 已断开');
      setState((prev) => ({ ...prev, yjsConnectionStatus: 'disconnected' }));
    });

    yjsClient.on('error', (error: any) => {
      console.error('❌ [YJS] YJS 错误:', error);
      setState((prev) => ({ ...prev, error: `YJS 错误: ${error.message}` }));
    });

    // 监听 YJS 文档更新
    yjsClient.on('document_update', (data: any) => {
      console.log('📄 [YJS] 文档已更新:', data);
      
      // 根据文档ID判断是字段还是记录更新
      if (data.documentId.includes('fields')) {
        console.log('🔄 [YJS] 字段文档更新，刷新字段列表');
        fetchFields();
      } else if (data.documentId.includes('records')) {
        console.log('🔄 [YJS] 记录文档更新，刷新记录列表');
        fetchRecords();
      }
    });

    // 检查当前连接状态
    const currentState = yjsClient.getConnectionState();
    console.log('🔍 [YJS] 当前 YJS 连接状态:', currentState);

    // 如果未连接，尝试连接
    if (currentState === 'disconnected') {
      console.log('🔄 [YJS] 尝试连接 YJS...');
      yjsClient.connect().catch((error: any) => {
        console.error('❌ [YJS] YJS 连接失败:', error);
        setState((prev) => ({ ...prev, error: `YJS 连接失败: ${error.message}` }));
      });
    }

    // 获取或创建 YJS 文档
    try {
      const fieldsDocId = `table_${tableId}_fields`;
      const recordsDocId = `table_${tableId}_records`;
      
      const fieldsDoc = yjsClient.getDocument(fieldsDocId);
      const recordsDoc = yjsClient.getDocument(recordsDocId);
      
      yjsDocumentRef.current = { fieldsDoc, recordsDoc };
      
      // 订阅字段文档
      fieldsDoc.subscribe((update: Uint8Array) => {
        console.log('📄 [YJS] 字段文档更新:', update);
        fetchFields();
      });
      
      // 订阅记录文档
      recordsDoc.subscribe((update: Uint8Array) => {
        console.log('📄 [YJS] 记录文档更新:', update);
        fetchRecords();
      });
      
      console.log('✅ [YJS] 已订阅文档:', { fieldsDocId, recordsDocId });
    } catch (error) {
      console.error('❌ [YJS] 订阅文档失败:', error);
    }

    return () => {
      console.log('🧹 [YJS] 清理 YJS 监听器');
      yjsClient.removeAllListeners();
    };
  }, [sdk, tableId, fetchFields, fetchRecords]);

  // 设置 WebSocket 监听器（作为备用）
  const setupWebSocketListeners = useCallback(() => {
    if (!sdk) {
      console.warn('⚠️ [YJS] SDK 未初始化');
      return;
    }

    const wsClient = sdk.getWebSocketClient();
    if (!wsClient) {
      console.warn('⚠️ [YJS] WebSocket 客户端未初始化');
      return;
    }

    console.log('🔌 [YJS] 设置 WebSocket 监听器（备用）...', {
      wsClient,
      connectionState: wsClient.getConnectionState(),
    });

    // 监听连接状态变化
    wsClient.on('connected', () => {
      console.log('✅ [YJS] WebSocket 已连接（备用）');
      setState((prev) => ({ ...prev, connectionStatus: 'connected' }));
    });

    wsClient.on('disconnected', () => {
      console.log('⚠️ [YJS] WebSocket 已断开（备用）');
      setState((prev) => ({ ...prev, connectionStatus: 'disconnected' }));
    });

    wsClient.on('error', (error: any) => {
      console.error('❌ [YJS] WebSocket 错误（备用）:', error);
      setState((prev) => ({ ...prev, error: `WebSocket 错误: ${error.message}` }));
    });

    // 检查当前连接状态
    const currentState = wsClient.getConnectionState();
    console.log('🔍 [YJS] 当前 WebSocket 连接状态（备用）:', currentState);

    // 如果未连接，尝试连接
    if (currentState === 'disconnected') {
      console.log('🔄 [YJS] 尝试连接 WebSocket（备用）...');
      wsClient.connect().catch((error: any) => {
        console.error('❌ [YJS] WebSocket 连接失败（备用）:', error);
        setState((prev) => ({ ...prev, error: `WebSocket 连接失败: ${error.message}` }));
      });
    }

    return () => {
      console.log('🧹 [YJS] 清理 WebSocket 监听器（备用）');
      wsClient.removeAllListeners();
    };
  }, [sdk]);

  // 初始化数据
  useEffect(() => {
    if (!sdk || !tableId || isInitializedRef.current) return;

    console.log('🚀 [YJS] 初始化实时同步...');
    isInitializedRef.current = true;

    const init = async () => {
      setState((prev) => ({ 
        ...prev, 
        isLoading: true, 
        connectionStatus: 'connecting',
        yjsConnectionStatus: 'connecting'
      }));

      try {
        // 设置 YJS 监听器
        const yjsCleanup = setupYjsListeners();

        // 设置 WebSocket 监听器（备用）
        const wsCleanup = setupWebSocketListeners();

        // 初始加载数据
        await Promise.all([fetchFields(), fetchRecords()]);

        setState((prev) => ({ ...prev, isLoading: false }));

        return () => {
          yjsCleanup?.();
          wsCleanup?.();
        };
      } catch (error) {
        console.error('❌ [YJS] 初始化失败:', error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: `初始化失败: ${(error as Error).message}`,
        }));
      }
    };

    init();
  }, [sdk, tableId, setupYjsListeners, setupWebSocketListeners, fetchFields, fetchRecords]);

  // 自动刷新 - 仅在连接断开时作为备用方案
  useEffect(() => {
    if (!autoRefresh || !sdk || !tableId) return;

    const scheduleRefresh = () => {
      refreshTimeoutRef.current = setTimeout(() => {
        // 只有在 YJS 和 WebSocket 都断开时才自动刷新
        if (state.yjsConnectionStatus === 'disconnected' && state.connectionStatus === 'disconnected') {
          console.log('⏰ [YJS] 连接断开，使用自动刷新作为备用方案...');
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
  }, [autoRefresh, sdk, tableId, refresh, refreshInterval, state.yjsConnectionStatus, state.connectionStatus]);

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

