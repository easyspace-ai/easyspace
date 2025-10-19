# @easyspace/sdk

一个功能强大的 TypeScript SDK，用于与 EasySpace 协作数据库平台进行交互。该 SDK 提供了类似 Airtable SDK 的 API 设计，支持完整的 CRUD 操作、实时协作、高级查询等功能。

## 特性

- 🚀 **完整的 API 覆盖** - 支持所有 EasySpace 平台功能
- 🔄 **实时协作** - WebSocket 支持，实时数据同步
- 📊 **多种视图类型** - 网格、表单、看板、日历、画廊视图
- 🔍 **高级查询** - 复杂查询、聚合、搜索功能
- 🛡️ **类型安全** - 完整的 TypeScript 类型定义
- 🔧 **易于使用** - 类似 Airtable SDK 的 API 设计
- 📦 **模块化** - 按功能模块组织，按需使用
- 🎯 **错误处理** - 完善的错误处理和重试机制

## 安装

```bash
bun add @easyspace/sdk
# 或
npm install @easyspace/sdk
```

## 快速开始

### 前置条件

1. 启动 EasySpace 服务器
   ```bash
   cd server
   ./bin/easyspace serve
   ```

2. 初始化测试用户（首次使用）
   ```bash
   cd packages/sdk
   bun test:setup
   ```

### 基本使用

```typescript
import EasySpaceSDK from '@easyspace/sdk';

// 初始化 SDK
const easyspace = new EasySpaceSDK({
  baseUrl: 'http://localhost:8080',  // 本地开发
  debug: true
});

// 用户登录
const authResponse = await easyspace.login({
  email: 'test@example.com',
  password: 'password123'
});

// 获取空间列表
const spaces = await easyspace.spaces.list();

// 获取基础数据
const bases = await easyspace.bases.list({ spaceId: spaces[0].id });

// 获取表数据
const tables = await easyspace.tables.list({ baseId: bases[0].id });

// 获取记录
const records = await easyspace.records.list({ 
  tableId: tables[0].id,
  pageSize: 10 
});

console.log('Records:', records);
```

### 实时协作

```typescript
// 启用实时协作
await easyspace.collaboration.connect();

// 监听数据变化
easyspace.collaboration.on('record:created', (record) => {
  console.log('New record created:', record);
});

easyspace.collaboration.on('record:updated', (record) => {
  console.log('Record updated:', record);
});
```

## API 参考

### 认证客户端

```typescript
// 用户登录
await easyspace.auth.login({ email, password });

// 用户注册
await easyspace.auth.register({ email, password, name });

// 获取当前用户
const user = await easyspace.auth.getCurrentUser();

// 登出
await easyspace.auth.logout();
```

### 空间管理

```typescript
// 创建空间
const space = await easyspace.spaces.create({
  name: 'My Workspace',
  description: 'A collaborative workspace'
});

// 获取空间列表
const spaces = await easyspace.spaces.list();

// 更新空间
await easyspace.spaces.update(spaceId, { name: 'Updated Name' });

// 删除空间
await easyspace.spaces.delete(spaceId);
```

### 基础数据管理

```typescript
// 创建基础数据
const base = await easyspace.bases.create({
  name: 'Project Database',
  spaceId: spaceId
});

// 获取基础数据列表
const bases = await easyspace.bases.list({ spaceId });

// 更新基础数据
await easyspace.bases.update(baseId, { name: 'Updated Base' });

// 删除基础数据
await easyspace.bases.delete(baseId);
```

### 表管理

```typescript
// 创建表
const table = await easyspace.tables.create({
  name: 'Tasks',
  baseId: baseId
});

// 获取表列表
const tables = await easyspace.tables.list({ baseId });

// 更新表
await easyspace.tables.update(tableId, { name: 'Updated Table' });

// 删除表
await easyspace.tables.delete(tableId);
```

### 字段管理

```typescript
// 创建字段
const field = await easyspace.fields.create({
  name: 'Status',
  type: 'select',
  tableId: tableId,
  options: {
    choices: [
      { name: 'Todo', color: 'blue' },
      { name: 'In Progress', color: 'yellow' },
      { name: 'Done', color: 'green' }
    ]
  }
});

// 获取字段列表
const fields = await easyspace.fields.list({ tableId });

// 更新字段
await easyspace.fields.update(fieldId, { name: 'Updated Field' });

// 删除字段
await easyspace.fields.delete(fieldId);
```

### 记录操作

```typescript
// 创建记录
const record = await easyspace.records.create({
  tableId: tableId,
  data: {
    'Name': 'Task 1',
    'Status': 'Todo',
    'Due Date': new Date()
  }
});

// 获取记录列表
const records = await easyspace.records.list({ 
  tableId,
  pageSize: 50,
  sort: [{ field: 'Created Time', direction: 'desc' }]
});

// 更新记录
await easyspace.records.update(recordId, {
  data: { 'Status': 'In Progress' }
});

// 删除记录
await easyspace.records.delete(recordId);
```

### 视图管理

```typescript
// 创建视图
const view = await easyspace.views.create({
  name: 'Kanban View',
  type: 'kanban',
  tableId: tableId,
  config: {
    groupBy: 'Status',
    groupOrder: ['Todo', 'In Progress', 'Done']
  }
});

// 获取视图列表
const views = await easyspace.views.list({ tableId });

// 更新视图
await easyspace.views.update(viewId, { name: 'Updated View' });

// 删除视图
await easyspace.views.delete(viewId);
```

## 高级功能

### 查询和过滤

```typescript
// 复杂查询
const records = await easyspace.records.list({
  tableId,
  filter: {
    and: [
      { field: 'Status', operator: 'equals', value: 'Todo' },
      { field: 'Priority', operator: 'greater_than', value: 3 }
    ]
  },
  sort: [
    { field: 'Priority', direction: 'desc' },
    { field: 'Created Time', direction: 'asc' }
  ]
});
```

### 批量操作

```typescript
// 批量创建记录
const records = await easyspace.records.batchCreate({
  tableId,
  records: [
    { data: { 'Name': 'Task 1', 'Status': 'Todo' } },
    { data: { 'Name': 'Task 2', 'Status': 'Todo' } },
    { data: { 'Name': 'Task 3', 'Status': 'Todo' } }
  ]
});

// 批量更新记录
await easyspace.records.batchUpdate({
  tableId,
  updates: [
    { recordId: 'rec1', data: { 'Status': 'Done' } },
    { recordId: 'rec2', data: { 'Status': 'Done' } }
  ]
});
```

## 开发

### 运行测试

```bash
# 运行所有测试
bun test:all

# 运行特定测试
bun test:auth
bun test:space
bun test:record
bun test:view
```

### 构建

```bash
# 构建 SDK
bun build

# 开发模式（监听文件变化）
bun dev
```

### 代码检查

```bash
# 运行 ESLint
bun lint

# 修复 ESLint 错误
bun lint:fix
```

## 贡献

我们欢迎贡献！请查看我们的 [CONTRIBUTING.md](../../CONTRIBUTING.md) 文件了解如何参与开发。

## 许可证

MIT License - 查看 [LICENSE](LICENSE) 文件了解详情。

## 支持

如果您遇到任何问题或有任何问题，请：

1. 查看 [文档](https://github.com/easyspace-ai/easyspace/tree/main/packages/sdk#readme)
2. 在 [GitHub Issues](https://github.com/easyspace-ai/easyspace/issues) 中报告问题
3. 加入我们的社区讨论

---

**EasySpace SDK** - 让协作数据库开发变得简单而强大。