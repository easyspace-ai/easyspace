/**
 * 完整示例：在应用中使用外部 SDK 实例
 */

import React, { useState, useEffect, createContext, useContext } from 'react';
import { LuckDB } from '@luckdb/sdk';
import { StandardDataView, AppProviders } from '@luckdb/aitable';
import type { IGridProps } from '@luckdb/aitable';

// ==================== SDK Context ====================

interface SDKContextType {
  sdk: LuckDB | null;
  isLoading: boolean;
  error: Error | null;
}

const SDKContext = createContext<SDKContextType>({
  sdk: null,
  isLoading: true,
  error: null,
});

export function SDKProvider({ children }: { children: React.ReactNode }) {
  const [sdk, setSdk] = useState<LuckDB | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function initSDK() {
      try {
        // 1. 创建 SDK 实例
        const luckDB = new LuckDB({
          baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
          accessToken: localStorage.getItem('luckdb_token') || '',
          debug: true,
        });

        // 2. 如果有 token，验证是否有效
        const token = localStorage.getItem('luckdb_token');
        if (token) {
          try {
            await luckDB.getCurrentUser();
            console.log('✅ Token 有效，已登录');
            setSdk(luckDB);
          } catch (err) {
            console.warn('⚠️ Token 无效，需要重新登录');
            localStorage.removeItem('luckdb_token');
            // 这里可以跳转到登录页
          }
        } else {
          console.log('ℹ️ 未登录，需要登录');
          // 这里可以跳转到登录页
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

  return (
    <SDKContext.Provider value={{ sdk, isLoading, error }}>
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

function LoginForm({ onSuccess }: { onSuccess: (sdk: LuckDB) => void }) {
  const [email, setEmail] = useState('demo@luckdb.com');
  const [password, setPassword] = useState('demo123');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const luckDB = new LuckDB({
        baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
        debug: true,
      });

      const response = await luckDB.login({ email, password });
      
      // 保存 token
      localStorage.setItem('luckdb_token', response.accessToken);
      
      console.log('✅ 登录成功');
      onSuccess(luckDB);
    } catch (err: any) {
      console.error('❌ 登录失败:', err);
      setError(err.message || '登录失败');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <form onSubmit={handleLogin} className="w-full max-w-md space-y-4 rounded-lg bg-white p-8 shadow">
        <h1 className="text-2xl font-bold">LuckDB 登录</h1>
        
        {error && (
          <div className="rounded bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-gray-700">邮箱</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">密码</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2"
            required
          />
        </div>
        
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? '登录中...' : '登录'}
        </button>
      </form>
    </div>
  );
}

// ==================== Table View Component ====================

function TableView({ sdk, baseId, tableId }: {
  sdk: LuckDB;
  baseId: string;
  tableId: string;
}) {
  const [fields, setFields] = useState([]);
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // 加载字段
        const fieldsData = await sdk.listFields({ tableId });
        setFields(fieldsData);

        // 加载记录
        const recordsData = await sdk.listRecords({ tableId });
        setRecords(recordsData.data || []);
      } catch (err) {
        console.error('加载数据失败:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [sdk, tableId]);

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">加载中...</div>;
  }

  // 转换为 Grid 需要的格式
  const columns = fields.map((field: any) => ({
    id: field.id,
    name: field.name,
    type: field.type,
    width: 150,
  }));

  const gridProps: IGridProps = {
    columns,
    rowCount: records.length,
    getCellContent: ([colIndex, rowIndex]) => {
      const record = records[rowIndex];
      const field = fields[colIndex];
      const value = record?.fields?.[field.id];
      
      return {
        type: field.type,
        data: value,
        displayData: String(value || ''),
      };
    },
    onCellEdited: async (cell, newValue) => {
      const [colIndex, rowIndex] = cell;
      const record = records[rowIndex];
      const field = fields[colIndex];
      
      try {
        await sdk.updateRecord(tableId, record.id, {
          data: { [field.id]: newValue },
        });
        console.log('✅ 更新成功');
      } catch (err) {
        console.error('❌ 更新失败:', err);
      }
    },
  };

  return (
    <AppProviders
      sdk={sdk}  // ✅ 传入外部 SDK
      baseId={baseId}
      tableId={tableId}
    >
      <StandardDataView
        sdk={sdk}  // ✅ 也传给 StandardDataView
        gridProps={gridProps}
        showHeader
        showToolbar
        showStatus
      />
    </AppProviders>
  );
}

// ==================== Main App ====================

export default function App() {
  const { sdk, isLoading, error } = useSDK();
  const [currentSDK, setCurrentSDK] = useState<LuckDB | null>(sdk);

  useEffect(() => {
    if (sdk) setCurrentSDK(sdk);
  }, [sdk]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-lg">初始化中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-red-600">错误: {error.message}</div>
      </div>
    );
  }

  if (!currentSDK) {
    return <LoginForm onSuccess={setCurrentSDK} />;
  }

  // 从 URL 获取 baseId 和 tableId，或使用默认值
  const params = new URLSearchParams(window.location.search);
  const baseId = params.get('baseId') || 'base_default';
  const tableId = params.get('tableId') || 'table_default';

  return (
    <div className="h-screen">
      <TableView
        sdk={currentSDK}
        baseId={baseId}
        tableId={tableId}
      />
    </div>
  );
}

// ==================== Root Render ====================

// 使用示例：
// import { SDKProvider } from './App.example';
// 
// ReactDOM.createRoot(document.getElementById('root')!).render(
//   <React.StrictMode>
//     <SDKProvider>
//       <App />
//     </SDKProvider>
//   </React.StrictMode>
// );

