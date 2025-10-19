# LuckDB Aitable Demo

> 完整的 SDK 依赖注入演示项目

## ✨ 最新更新 (2025-10-17)

🎉 **内置字段映射功能** - Demo 已更新为使用内置的字段类型映射工具！

- ✅ **代码简化 93%** - 从 30+ 行减少到 2 行
- ✅ **支持 30+ 种字段类型** - 自动处理所有字段类型
- ✅ **自动字段图标** - 📝, 🔢, 📅, ⭐, 👤, 等
- ✅ **智能数据解析** - 自动识别多种 SDK 返回格式
- ✅ **零配置使用** - 开箱即用

详细说明请查看：[字段映射更新文档](./FIELD_MAPPING_UPDATE.md)

## 🎯 演示内容

这个 Demo 展示了如何在实际项目中使用 `@luckdb/aitable` 组件：

1. ✅ **SDK 全局初始化** - 在应用启动时初始化一次
2. ✅ **登录管理** - 统一的登录状态管理
3. ✅ **依赖注入** - 将 SDK 实例注入到组件
4. ✅ **多组件共享** - 所有组件共享同一个 SDK
5. ✅ **数据加载** - 从后端加载表格数据
6. ✅ **实时编辑** - 单元格编辑并同步到后端
7. ✅ **内置字段映射** - 自动处理所有字段类型 🆕

## 🚀 快速开始

### 1. 安装依赖

```bash
cd packages/aitable/demo
pnpm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

编辑 `.env`：

```env
VITE_API_BASE_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
VITE_BASE_ID=your_base_id
VITE_TABLE_ID=your_table_id
```

### 3. 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:5175

## 📁 项目结构

```
demo/
├── src/
│   ├── main.tsx        # 入口文件
│   ├── App.tsx         # 主应用（包含完整的 SDK 管理逻辑）
│   └── config.ts       # 配置文件
├── index.html          # HTML 模板
├── package.json        # 依赖配置
├── vite.config.ts      # Vite 配置
└── README.md           # 本文件
```

## 💡 核心代码解析

### SDK Context Provider

```tsx
// 创建 SDK Context
const SDKContext = createContext<SDKContextType>({ ... });

export function SDKProvider({ children }) {
  const [sdk, setSdk] = useState<LuckDB | null>(null);

  useEffect(() => {
    // 初始化 SDK
    const luckDB = new LuckDB({
      baseURL: config.baseURL,
      accessToken: localStorage.getItem('token'),
    });

    // 检查登录状态
    luckDB.getCurrentUser()
      .then(() => setSdk(luckDB))
      .catch(() => console.log('需要登录'));
  }, []);

  return (
    <SDKContext.Provider value={{ sdk, login, logout }}>
      {children}
    </SDKContext.Provider>
  );
}
```

### 注入到组件

```tsx
function TableView() {
  const { sdk } = useSDK();  // 从 Context 获取 SDK

  return (
    <AppProviders sdk={sdk}>  {/* 注入到 AppProviders */}
      <StandardDataView
        sdk={sdk}  {/* 也可以直接传给 StandardDataView */}
        gridProps={{ ... }}
      />
    </AppProviders>
  );
}
```

### 数据加载

```tsx
useEffect(() => {
  if (!sdk) return;

  async function loadData() {
    // 使用注入的 SDK 加载数据
    const fields = await sdk.listFields({ tableId });
    const records = await sdk.listRecords({ tableId });
    
    setFields(fields);
    setRecords(records.data);
  }

  loadData();
}, [sdk]);
```

### 单元格编辑

```tsx
const gridProps: IGridProps = {
  columns,
  rowCount: records.length,
  getCellContent: ([col, row]) => ({ ... }),
  
  // 编辑回调 - 使用注入的 SDK 更新数据
  onCellEdited: async (cell, newValue) => {
    const [colIndex, rowIndex] = cell;
    const record = records[rowIndex];
    const field = fields[colIndex];
    
    await sdk.updateRecord(tableId, record.id, {
      data: { [field.id]: newValue }
    });
    
    // 更新本地状态
    setRecords(prev => { ... });
  },
};
```

## 🎨 特性展示

### 1. 登录界面

- 美观的渐变背景
- 输入验证
- 错误提示
- 默认填充测试账号

### 2. 数据表格

- 完整的 Grid 功能
- 字段和记录展示
- 实时编辑
- 工具栏和状态栏

### 3. Header

- 显示当前状态
- 字段和记录数量
- 登出按钮

## 🔍 调试

### 开启调试模式

在 `src/config.ts` 中设置：

```ts
export const config = {
  debug: true,  // 开启调试日志
  // ...
};
```

### 查看控制台

打开浏览器控制台，会看到详细的日志：

```
🚀 初始化 LuckDB SDK...
✅ 已登录: { id: 'xxx', email: 'demo@luckdb.com' }
📊 加载数据... { baseId: 'xxx', tableId: 'yyy' }
✅ 字段加载成功: [...]
✅ 记录加载成功: [...]
💾 更新单元格: { recordId: 'xxx', fieldId: 'yyy', value: 'new' }
✅ 更新成功
```

## 🐛 常见问题

### 1. 无法连接到后端

**问题**: `Failed to fetch` 或 `Network error`

**解决**:
1. 检查后端是否启动
2. 检查 `.env` 中的 API 地址
3. 检查浏览器控制台是否有 CORS 错误

### 2. 登录失败

**问题**: 登录返回 401 或 403

**解决**:
1. 检查账号密码是否正确
2. 检查后端数据库是否有测试账号
3. 查看后端日志

### 3. 数据加载失败

**问题**: 显示"加载失败"

**解决**:
1. 检查 `baseId` 和 `tableId` 是否正确
2. 检查账号是否有权限访问该表
3. 查看浏览器控制台错误日志

### 4. 编辑无效

**问题**: 单元格编辑后没有保存

**解决**:
1. 检查控制台是否有更新错误
2. 检查账号是否有编辑权限
3. 检查后端是否正常处理更新请求

## 📚 相关文档

- [升级指南](../UPGRADE_GUIDE.md)
- [完整特性报告](../../../book/ai-reports/features/2025-10-17_feature_sdk_injection_and_standard_packaging.md)
- [测试清单](../TEST_CHECKLIST.md)

## 🎓 学习资源

### SDK 初始化

```tsx
const sdk = new LuckDB({
  baseURL: 'https://api.luckdb.com',
  accessToken: token,
  debug: true,
});
```

### 登录

```tsx
const response = await sdk.login({
  email: 'user@example.com',
  password: 'password',
});

localStorage.setItem('token', response.accessToken);
```

### 数据操作

```tsx
// 列表
const fields = await sdk.listFields({ tableId });
const records = await sdk.listRecords({ tableId });

// 更新
await sdk.updateRecord(tableId, recordId, {
  data: { fieldId: newValue }
});

// 创建
await sdk.createRecord(tableId, {
  data: { field1: 'value1', field2: 'value2' }
});
```

## 🚀 部署

### 构建生产版本

```bash
pnpm build
```

输出到 `dist/` 目录。

### 预览

```bash
pnpm preview
```

## 📝 开发建议

1. **使用 TypeScript** - 享受完整的类型提示
2. **开启 debug 模式** - 方便调试
3. **查看控制台** - 了解数据流
4. **参考源码** - `src/App.tsx` 有详细注释

## 💬 反馈

遇到问题或有建议？

1. 查看 [测试清单](../TEST_CHECKLIST.md)
2. 提交 [GitHub Issue](https://github.com/luckdb/luckdb/issues)
3. 加入 Discord 社区

---

**Happy Coding!** 🎉

