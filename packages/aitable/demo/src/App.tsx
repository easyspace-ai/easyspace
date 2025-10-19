/**
 * LuckDB Aitable Demo - SDK 依赖注入示例
 *
 * 这个 Demo 展示了如何：
 * 1. 在应用启动时初始化 LuckDB SDK
 * 2. 登录并获取数据
 * 3. 将 SDK 实例注入到 Grid 组件
 * 4. 多个组件共享同一个 SDK 实例
 * 5. 测试 AddRecordDialog 功能
 */

import React, { useState, useEffect, createContext, useContext, useCallback, useMemo } from 'react';
import { LuckDB } from '@luckdb/sdk';
import {
  StandardDataView,
  AppProviders,
  AddRecordDialog,
  createGetCellContent,
  convertFieldsToColumns,
  FieldManagementProvider,
  type FilterField,
  type FilterCondition,
  type IGridProps,
  type FieldConfig,
} from '@luckdb/aitable';
import { config } from './config';
import { StyleTest } from './StyleTest';
import AddRecordTest from './AddRecordTest';
import { RealtimeDemo } from './RealtimeDemo';
import { useRealtimeSync } from './hooks/useRealtimeSync';

// ==================== SDK Context ====================

interface SDKContextType {
  sdk: LuckDB | null;
  isLoading: boolean;
  error: Error | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const SDKContext = createContext<SDKContextType>({
  sdk: null,
  isLoading: true,
  error: null,
  login: async () => {},
  logout: () => {},
});

export function SDKProvider({ children }: { children: React.ReactNode }) {
  const [sdk, setSdk] = useState<LuckDB | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 初始化 SDK
  useEffect(() => {
    async function initSDK() {
      try {
        console.log('🚀 初始化 LuckDB SDK...');

        const luckDB = new LuckDB({
          baseUrl: config.baseURL,
          websocketURL: config.wsURL,
          accessToken: localStorage.getItem('luckdb_token') || '',
          debug: config.debug,
        });

        // 检查是否有保存的 token
        const token = localStorage.getItem('luckdb_token');
        if (token) {
          try {
            const user = await luckDB.getCurrentUser();
            console.log('✅ 已登录:', user);

            // 确保 WebSocket 连接
            if (luckDB.getWebSocketClient()) {
              console.log('🔌 尝试连接 WebSocket...');
              await luckDB.getWebSocketClient()!.connect();
            }

            setSdk(luckDB);
          } catch (err) {
            console.warn('⚠️ Token 失效，需要重新登录');
            localStorage.removeItem('luckdb_token');
          }
        } else {
          console.log('ℹ️ 未登录');
        }
      } catch (err) {
        console.error('❌ SDK 初始化失败:', err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    }

    initSDK();
  }, []);

  // 登录方法
  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🔐 登录中...', { email });

      const luckDB = new LuckDB({
        baseUrl: config.baseURL,
        websocketURL: config.wsURL,
        debug: config.debug,
      });

      const response = await luckDB.login({ email, password });

      // 保存 token
      localStorage.setItem('luckdb_token', response.accessToken);

      console.log('✅ 登录成功:', response.user);
      setSdk(luckDB);
    } catch (err: any) {
      console.error('❌ 登录失败:', err);
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 登出方法
  const logout = useCallback(() => {
    console.log('👋 登出');
    localStorage.removeItem('luckdb_token');
    setSdk(null);
  }, []);

  return (
    <SDKContext.Provider value={{ sdk, isLoading, error, login, logout }}>
      {children}
    </SDKContext.Provider>
  );
}

export function useSDK() {
  const context = useContext(SDKContext);
  if (!context) {
    throw new Error('useSDK must be used within SDKProvider');
  }
  return context;
}

// ==================== Login Component ====================

function LoginForm() {
  const { login, isLoading, error } = useSDK();
  const [email, setEmail] = useState(config.demo.email);
  const [password, setPassword] = useState(config.demo.password);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    try {
      await login(email, password);
    } catch (err) {
      // Error already handled in context
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <form
        onSubmit={handleLogin}
        style={{
          width: '100%',
          maxWidth: '400px',
          padding: '32px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
      >
        <h1
          style={{
            fontSize: '28px',
            fontWeight: 'bold',
            marginBottom: '8px',
            color: '#1a202c',
          }}
        >
          LuckDB Aitable
        </h1>
        <p
          style={{
            fontSize: '14px',
            color: '#718096',
            marginBottom: '24px',
          }}
        >
          SDK 依赖注入演示
        </p>

        {error && (
          <div
            style={{
              padding: '12px',
              marginBottom: '16px',
              background: '#fee',
              border: '1px solid #fcc',
              borderRadius: '8px',
              color: '#c53030',
              fontSize: '14px',
            }}
          >
            ❌ {error.message || '登录失败'}
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '8px',
              color: '#4a5568',
            }}
          >
            邮箱
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
            }}
            required
            placeholder="demo@luckdb.com"
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '500',
              marginBottom: '8px',
              color: '#4a5568',
            }}
          >
            密码
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
            }}
            required
            placeholder="demo123"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '12px',
            background: isLoading ? '#cbd5e0' : '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {isLoading ? '登录中...' : '登录'}
        </button>

        <div
          style={{
            marginTop: '24px',
            padding: '12px',
            background: '#f7fafc',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#718096',
          }}
        >
          <p style={{ marginBottom: '8px' }}>
            💡 <strong>演示说明：</strong>
          </p>
          <p>• 使用外部 SDK 实例注入</p>
          <p>• 全局共享 SDK，避免重复登录</p>
          <p>• 支持 WebSocket 连接共享</p>
          <p>• 内置 AddRecordDialog 功能</p>
        </div>
      </form>
    </div>
  );
}

// ==================== Table View Component ====================

function TableView() {
  const { sdk, logout } = useSDK();
  const [currentView, setCurrentView] = useState<'table' | 'test' | 'realtime'>('table');

  // 🚀 使用实时同步 Hook
  const { fields, records, isLoading, error, lastSyncTime, connectionStatus, refresh } =
    useRealtimeSync({
      tableId: config.testBase.tableId,
      baseId: config.testBase.baseId,
      sdk,
      autoRefresh: true,
      refreshInterval: 10000, // 10秒自动刷新
    });

  // 过滤状态
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<any[]>([]);

  // 🎉 使用内置字段映射工具 - 自动处理所有字段类型！
  // 将所有 Hooks 移到条件渲染之前，确保 Hooks 调用顺序一致
  const columns = useMemo(() => convertFieldsToColumns(fields), [fields]);
  const getCellContent = useMemo(() => createGetCellContent(fields, records), [fields, records]);

  // 生成过滤字段配置
  const filterFields: FilterField[] = useMemo(() => {
    return fields.map((field: any) => ({
      id: field.id ?? field.fieldId ?? String(field.key ?? field.name),
      name: field.name ?? field.title ?? String(field.id ?? ''),
      type: (field.type ?? 'text') as FilterField['type'],
      options: field.options?.choices || field.options?.selectOptions || undefined,
    }));
  }, [fields]);

  // 数据加载已由 useRealtimeSync Hook 处理

  // 当记录数据变化时，更新过滤后的记录
  useEffect(() => {
    setFilteredRecords(records);
  }, [records]);

  // 处理过滤条件变化
  const handleFilterConditionsChange = useCallback((conditions: FilterCondition[]) => {
    setFilterConditions(conditions);
  }, []);

  // 处理过滤结果变化
  const handleFilteredDataChange = useCallback((filteredData: any[]) => {
    setFilteredRecords(filteredData);
  }, []);

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          gap: '16px',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            border: '4px solid #e2e8f0',
            borderTop: '4px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        <p style={{ fontSize: '16px', color: '#718096' }}>加载数据中...</p>
        <style>
          {`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}
        </style>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          gap: '16px',
          padding: '24px',
        }}
      >
        <div
          style={{
            fontSize: '48px',
          }}
        >
          ⚠️
        </div>
        <h2
          style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#1a202c',
          }}
        >
          加载失败
        </h2>
        <p
          style={{
            fontSize: '14px',
            color: '#718096',
            textAlign: 'center',
            maxWidth: '400px',
          }}
        >
          {error}
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 24px',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          重新加载
        </button>
      </div>
    );
  }

  // 🎉 使用内置字段映射工具 - 自动处理所有字段类型！
  // 只需要 2 行代码，替代原来的 30+ 行手动映射
  // 注意：useMemo 已移到组件顶部，确保 Hooks 调用顺序一致

  const gridProps: IGridProps = {
    columns,
    rowCount: records.length,
    getCellContent,
    onCellEdited: async (cell, newValue) => {
      const [colIndex, rowIndex] = cell;
      const record = records[rowIndex];
      const field = fields[colIndex];

      if (!sdk || !record || !field) return;

      try {
        console.log('💾 更新单元格:', {
          recordId: record.id,
          fieldId: field.id,
          value: newValue.data,
        });

        await sdk.updateRecord(config.testBase.tableId, record.id, {
          data: { [field.id]: newValue.data },
          version: record.version, // 添加版本号以支持乐观锁
        });

        console.log('✅ 更新成功');

        // 数据更新将由实时同步 Hook 自动处理
        // 无需手动更新本地状态，useRealtimeSync 会通过 WebSocket 事件自动刷新
      } catch (err) {
        console.error('❌ 更新失败:', err);
        alert('更新失败: ' + (err as Error).message);
      }
    },
  };

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 24px',
          background: 'white',
          borderBottom: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#1a202c',
            }}
          >
            LuckDB Aitable Demo
          </h1>
          <p
            style={{
              fontSize: '12px',
              color: '#718096',
            }}
          >
            ✅ SDK 已注入 • {fields.length} 个字段 • {records.length} 条记录
            {filterConditions.length > 0 && (
              <span style={{ color: '#3b82f6' }}> • 过滤后: {filteredRecords.length} 条</span>
            )}
            <br />
            🔄 实时同步:
            <span
              style={{
                color:
                  connectionStatus === 'connected'
                    ? '#10b981'
                    : connectionStatus === 'connecting'
                      ? '#f59e0b'
                      : '#ef4444',
                fontWeight: 'bold',
              }}
            >
              {connectionStatus === 'connected'
                ? '已连接'
                : connectionStatus === 'connecting'
                  ? '连接中'
                  : '已断开'}
            </span>
            {lastSyncTime && (
              <span style={{ color: '#6b7280' }}>
                • 最后同步: {lastSyncTime.toLocaleTimeString()}
              </span>
            )}
          </p>
          {/* 样式测试 */}
          <div style={{ marginTop: '8px' }}>
            <StyleTest />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* 视图切换 */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setCurrentView('table')}
              style={{
                padding: '6px 12px',
                background: currentView === 'table' ? '#3b82f6' : 'white',
                color: currentView === 'table' ? 'white' : '#718096',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              表格视图
            </button>
            <button
              onClick={() => setCurrentView('test')}
              style={{
                padding: '6px 12px',
                background: currentView === 'test' ? '#3b82f6' : 'white',
                color: currentView === 'test' ? 'white' : '#718096',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              功能测试
            </button>
            <button
              onClick={() => setCurrentView('realtime')}
              style={{
                padding: '6px 12px',
                background: currentView === 'realtime' ? '#3b82f6' : 'white',
                color: currentView === 'realtime' ? 'white' : '#718096',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              🔄 实时协作
            </button>
          </div>

          {/* 手动刷新按钮 */}
          <button
            onClick={refresh}
            disabled={isLoading}
            style={{
              padding: '6px 12px',
              background: isLoading ? '#e2e8f0' : '#10b981',
              color: isLoading ? '#9ca3af' : 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {isLoading ? '🔄' : '🔄'} {isLoading ? '刷新中...' : '刷新数据'}
          </button>

          <button
            onClick={logout}
            style={{
              padding: '8px 16px',
              background: 'white',
              color: '#718096',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#cbd5e0';
              e.currentTarget.style.color = '#4a5568';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.color = '#718096';
            }}
          >
            登出
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {currentView === 'realtime' ? (
          <RealtimeDemo
            tableId={config.testBase.tableId}
            recordId={records.length > 0 ? records[0].id : undefined}
          />
        ) : currentView === 'table' ? (
          <AppProviders
            sdk={sdk}
            baseId={config.testBase.baseId}
            tableId={config.testBase.tableId}
            viewId={config.testBase.viewId}
          >
            <FieldManagementProvider
              onFieldUpdated={(field) => {
                console.log('✅ 字段已更新:', field);
                // 刷新数据
                if (gridProps.onDataRefresh) {
                  gridProps.onDataRefresh();
                }
              }}
              onFieldDeleted={(fieldId) => {
                console.log('🗑️ 字段已删除:', fieldId);
                // 刷新数据
                if (gridProps.onDataRefresh) {
                  gridProps.onDataRefresh();
                }
              }}
              onError={(error, operation) => {
                console.error(`❌ 字段${operation === 'edit' ? '编辑' : '删除'}失败:`, error);
              }}
            >
              <StandardDataView
                sdk={sdk}
                tableId={config.testBase.tableId}
                // 过滤配置
                filterFields={filterFields}
                filterConditions={filterConditions}
                onFilterConditionsChange={handleFilterConditionsChange}
                onFilteredDataChange={handleFilteredDataChange}
                // 真实 API 调用创建视图
                onCreateView={async (viewType: string) => {
                  try {
                    console.log('🆕 创建视图:', viewType);

                    // 调用 LuckDB SDK 创建视图
                    const newView = await sdk!.createView({
                      tableId: config.testBase.tableId,
                      name: `${viewType}视图_${Date.now()}`,
                      type: viewType as any, // 确保类型匹配
                      description: `通过 Demo 创建的 ${viewType} 视图`,
                    });

                    console.log('✅ 视图创建成功:', newView);

                    // 刷新数据以获取最新的视图列表
                    if (gridProps.onDataRefresh) {
                      await gridProps.onDataRefresh();
                    }

                    // 可选：切换到新创建的视图
                    // setActiveViewId(newView.id);
                  } catch (error) {
                    console.error('❌ 创建视图失败:', error);
                    alert(`创建视图失败: ${(error as Error).message}`);
                  }
                }}
                gridProps={{
                  ...gridProps,
                  // 数据刷新回调 - 使用实时同步的刷新功能
                  onDataRefresh: async () => {
                    console.log('🔄 自动刷新数据...');
                    await refresh();
                  },
                }}
                fields={fields.map((f: any) => ({
                  id: f.id ?? f.fieldId ?? String(f.key ?? f.name),
                  name: f.name ?? f.title ?? String(f.id ?? ''),
                  type: f.type ?? 'text',
                  visible: true,
                  required: false,
                  isPrimary: f.primary || false,
                  description: f.description || '',
                  options: f.options || {},
                }))}
                // 最简配置：显示所有功能，不传任何回调
                showHeader
                showToolbar
                showStatus
                // 不传 onAddField、onAddColumn 等回调，让组件自动处理
                // 组件会自动使用 sdk + tableId 创建字段
              />
            </FieldManagementProvider>
          </AppProviders>
        ) : (
          <AddRecordTest />
        )}
      </div>
    </div>
  );
}

// ==================== Main App ====================

function App() {
  const { sdk, isLoading } = useSDK();

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
        }}
      >
        <div
          style={{
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              margin: '0 auto 16px',
              border: '4px solid #e2e8f0',
              borderTop: '4px solid #667eea',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          <p style={{ fontSize: '16px', color: '#718096' }}>初始化中...</p>
          <style>
            {`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}
          </style>
        </div>
      </div>
    );
  }

  if (!sdk) {
    return <LoginForm />;
  }

  return <TableView />;
}

// Wrap with SDKProvider and export as default
export default function AppWithProvider() {
  return (
    <SDKProvider>
      <App />
    </SDKProvider>
  );
}
