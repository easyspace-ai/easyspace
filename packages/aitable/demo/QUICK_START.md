# 🚀 快速启动指南

## 一分钟启动

```bash
# 1. 进入目录
cd packages/aitable/demo

# 2. 安装依赖
pnpm install

# 3. 启动
pnpm dev
```

访问 http://localhost:5175 🎉

## 📸 预览

### 登录界面
- 渐变紫色背景
- 默认填充测试账号
- 一键登录

### 表格界面
- 完整的 Grid 功能
- 实时数据加载
- 单元格编辑
- 工具栏支持

## ⚙️ 配置

### 方式 1: 使用默认配置（最简单）

直接启动即可，使用内置的默认配置：
- API: `http://localhost:3000`
- 账号: `demo@luckdb.com` / `demo123`

### 方式 2: 自定义配置

编辑 `src/config.ts`：

```ts
export const config = {
  baseURL: 'https://your-api.com',  // 你的 API 地址
  demo: {
    email: 'your@email.com',        // 你的账号
    password: 'your_password',      // 你的密码
  },
  testBase: {
    baseId: 'base_xxx',             // 你的 base ID
    tableId: 'table_yyy',           // 你的 table ID
  },
};
```

## 🎯 核心特性演示

### 1. SDK 全局初始化

```tsx
// App.tsx
const sdk = new LuckDB({
  baseURL: config.baseURL,
  accessToken: token,
});

// 整个应用共享这一个 SDK 实例
<SDKProvider sdk={sdk}>
  <App />
</SDKProvider>
```

### 2. 依赖注入

```tsx
// 从 Context 获取 SDK
const { sdk } = useSDK();

// 注入到组件
<AppProviders sdk={sdk}>
  <StandardDataView sdk={sdk} />
</AppProviders>
```

### 3. 数据加载

```tsx
// 使用注入的 SDK 加载数据
const fields = await sdk.listFields({ tableId });
const records = await sdk.listRecords({ tableId });
```

### 4. 实时编辑

```tsx
// 单元格编辑回调
onCellEdited: async (cell, newValue) => {
  await sdk.updateRecord(tableId, recordId, {
    data: { [fieldId]: newValue }
  });
}
```

## 🐛 调试

### 查看日志

打开浏览器控制台（F12），会看到：

```
🚀 初始化 LuckDB SDK...
✅ 已登录: { email: 'demo@luckdb.com' }
📊 加载数据...
✅ 字段加载成功: [...]
✅ 记录加载成功: [...]
```

### 常见问题

**Q: 连接失败？**
- 检查后端是否启动
- 检查 API 地址是否正确

**Q: 登录失败？**
- 检查账号密码
- 查看控制台错误信息

**Q: 数据加载失败？**
- 检查 baseId 和 tableId
- 检查账号权限

## 📚 学习路径

1. **先运行** - 看看效果
2. **查看 App.tsx** - 理解代码结构
3. **修改配置** - 连接你的后端
4. **自定义** - 修改界面和功能

## 🎓 代码结构

```
demo/src/
├── main.tsx          # 入口
├── App.tsx           # 主应用
│   ├── SDKProvider   # SDK Context
│   ├── LoginForm     # 登录界面
│   └── TableView     # 表格界面
└── config.ts         # 配置
```

## 💡 设计亮点

### React Context 模式

```tsx
// 创建 Context
const SDKContext = createContext<SDKContextType>({ ... });

// Provider 封装
export function SDKProvider({ children }) {
  const [sdk, setSdk] = useState<LuckDB | null>(null);
  // 初始化逻辑...
  return <SDKContext.Provider value={{ sdk }}>...</>;
}

// Hook 使用
export function useSDK() {
  return useContext(SDKContext);
}
```

### 依赖注入模式

```tsx
// 顶层注入
<SDKProvider>
  <App />
</SDKProvider>

// 子组件获取
function Component() {
  const { sdk } = useSDK();  // ✅ 获取注入的 SDK
  // 使用 sdk...
}
```

## 🚀 下一步

1. 阅读 [完整文档](./README.md)
2. 查看 [升级指南](../UPGRADE_GUIDE.md)
3. 参考 [API 文档](../../../docs/API.md)

---

**开始探索吧！** 💫

