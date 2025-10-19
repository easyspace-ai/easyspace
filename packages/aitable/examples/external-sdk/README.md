# 外部 SDK 注入示例

演示如何在已有的系统中使用 `@luckdb/aitable` 组件，直接注入外部已登录的 SDK 实例。

## 使用场景

在一个完整的 Web 应用中，通常会在应用启动时初始化并登录 SDK：

```tsx
// App.tsx (主应用)
import { LuckDB } from '@luckdb/sdk';
import { useState, useEffect } from 'react';

function App() {
  const [sdk, setSdk] = useState<LuckDB | null>(null);

  useEffect(() => {
    // 初始化 SDK
    const luckDB = new LuckDB({
      baseURL: 'https://api.luckdb.com',
      accessToken: localStorage.getItem('token') || '',
    });

    // 登录
    luckDB.login({
      email: 'user@example.com',
      password: 'password',
    }).then(() => {
      setSdk(luckDB);
    });
  }, []);

  if (!sdk) return <div>Loading...</div>;

  // 将 SDK 传递给子组件
  return (
    <div>
      <TableView sdk={sdk} />
    </div>
  );
}
```

## 方式 1: 直接传入 SDK（推荐）

```tsx
// TableView.tsx
import { StandardDataView, AppProviders } from '@luckdb/aitable';
import type { LuckDB } from '@luckdb/sdk';

interface TableViewProps {
  sdk: LuckDB; // 外部传入的 SDK 实例
}

function TableView({ sdk }: TableViewProps) {
  return (
    <AppProviders
      sdk={sdk}  // ✅ 直接传入 SDK
      baseId="base_xxx"
      tableId="table_yyy"
    >
      <StandardDataView
        sdk={sdk}  // ✅ 也可以传给 StandardDataView
        gridProps={{
          columns: [],
          rowCount: 0,
          getCellContent: () => ({ type: 'text', data: '', displayData: '' }),
        }}
      />
    </AppProviders>
  );
}
```

## 方式 2: 通过 Context 共享 SDK

```tsx
// SDKContext.tsx
import { createContext, useContext } from 'react';
import type { LuckDB } from '@luckdb/sdk';

const SDKContext = createContext<LuckDB | null>(null);

export function SDKProvider({ sdk, children }: { sdk: LuckDB; children: React.ReactNode }) {
  return <SDKContext.Provider value={sdk}>{children}</SDKContext.Provider>;
}

export function useSDK() {
  const sdk = useContext(SDKContext);
  if (!sdk) throw new Error('SDK not provided');
  return sdk;
}

// App.tsx
import { SDKProvider } from './SDKContext';

function App() {
  const [sdk, setSdk] = useState<LuckDB | null>(null);
  
  // ... 初始化 SDK
  
  return (
    <SDKProvider sdk={sdk}>
      <TableView />
    </SDKProvider>
  );
}

// TableView.tsx
import { useSDK } from './SDKContext';

function TableView() {
  const sdk = useSDK(); // 从 Context 获取 SDK
  
  return (
    <AppProviders sdk={sdk}>
      <StandardDataView
        sdk={sdk}
        gridProps={{ ... }}
      />
    </AppProviders>
  );
}
```

## 方式 3: 向后兼容 - 使用 ApiClient

如果你已经有自己的 API 客户端封装，仍然可以使用旧的方式：

```tsx
import { ApiClient } from '@luckdb/aitable';

const apiClient = new ApiClient({
  baseURL: 'https://api.luckdb.com',
  token: 'your-token',
});

<AppProviders apiClient={apiClient}>
  <StandardDataView
    apiClient={apiClient}
    gridProps={{ ... }}
  />
</AppProviders>
```

## 优势对比

### ❌ 旧方式（组件内部管理 SDK）

```tsx
// 问题：每个组件都要初始化和登录
<StandardDataView
  baseURL="https://api.luckdb.com"
  token="xxx"
  // 组件内部会创建 SDK 并登录
/>
```

**缺点**：
- 重复登录，浪费资源
- 多个组件使用不同的 SDK 实例
- 无法共享 WebSocket 连接
- 登录状态管理混乱

### ✅ 新方式（依赖注入）

```tsx
// 在应用启动时登录一次
const sdk = new LuckDB({ ... });
await sdk.login({ ... });

// 所有组件共享同一个 SDK
<StandardDataView sdk={sdk} />
<AnotherComponent sdk={sdk} />
```

**优点**：
- 全局单例，统一管理
- 共享 WebSocket 连接
- 登录状态一致
- 符合 React 最佳实践

## 完整示例

见 `examples/external-sdk/src/App.tsx`

## 技术细节

内部实现使用了 **适配器模式**：

```tsx
// sdk-adapter.ts
export function createAdapter(sdkOrClient: LuckDB | ApiClient): ISDKAdapter {
  if (isLuckDBSDK(sdkOrClient)) {
    return new LuckDBAdapter(sdkOrClient);  // SDK 适配器
  }
  return new ApiClientAdapter(sdkOrClient); // ApiClient 适配器
}
```

Grid 组件通过统一的 `ISDKAdapter` 接口访问数据，无需关心底层是 SDK 还是 ApiClient。

