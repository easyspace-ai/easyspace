# ShareDB 实时协作演示指南

## 概述

本演示展示了如何在 LuckDB Aitable Demo 中集成 ShareDB 实时协作功能，实现数据的实时同步和协作编辑。

## 功能特性

### 🔄 实时协作功能

- **实时数据同步**: 多个用户同时编辑时，数据变更会实时同步
- **操作转换**: 自动处理并发操作的冲突解决
- **WebSocket 连接**: 基于 WebSocket 的高效实时通信
- **订阅机制**: 支持订阅特定记录或表格的变更

### 🛠️ 技术实现

- **简化 ShareDB 客户端**: 专门为演示优化的轻量级实现
- **浏览器兼容**: 解决了 Node.js 模块在浏览器中的兼容性问题
- **错误处理**: 完善的错误处理和回退机制
- **状态管理**: 实时显示连接状态和订阅状态

## 使用方法

### 1. 启动演示

```bash
cd packages/aitable/demo
npm run dev
```

### 2. 登录系统

1. 打开浏览器访问 `http://localhost:5175`
2. 使用演示账号登录：
   - 邮箱: `demo@luckdb.com`
   - 密码: `demo123`

### 3. 进入实时协作演示

1. 登录成功后，点击顶部的 **"🔄 实时协作"** 按钮
2. 进入实时协作演示页面

### 4. 测试实时功能

#### 连接状态检查

- 页面会显示 ShareDB 连接状态
- 绿色表示已连接，红色表示未连接

#### 订阅记录变更

1. 点击 **"订阅记录变更"** 按钮
2. 开始监听第一条记录的实时变更
3. 状态会显示为"已订阅"

#### 实时更新测试

1. **更新名称字段**: 点击按钮更新记录的 name 字段
2. **更新描述字段**: 点击按钮更新记录的 description 字段
3. **批量更新**: 同时更新多个字段

#### 多用户协作测试

1. 在另一个浏览器标签页中打开相同页面
2. 登录相同的账号
3. 在一个页面中进行更新操作
4. 观察另一个页面是否实时收到更新

## 技术架构

### 核心组件

#### 1. SimpleShareDBClient

```typescript
// 简化的 ShareDB 客户端
export class SimpleShareDBClient {
  // 管理 WebSocket 连接
  // 处理文档订阅和操作
  // 提供简化的 API 接口
}
```

#### 2. RealtimeDemo 组件

```typescript
// 实时协作演示组件
export function RealtimeDemo({ tableId, recordId }) {
  // 管理连接状态
  // 处理订阅和更新操作
  // 显示实时数据变更
}
```

### 数据流

```
用户操作 → SimpleShareDBClient → WebSocket → 后端 ShareDB 服务
                ↓
其他用户 ← WebSocket ← 后端广播 ← 操作处理
```

### 操作格式

```typescript
// ShareDB 操作格式
interface SimpleOperation {
  p: (string | number)[];  // 路径
  oi?: any;                // 插入值
  od?: any;                // 删除值
}

// 示例：更新字段值
{
  p: ['fields', 'name'],
  oi: '新名称'
}
```

## 故障排除

### 常见问题

#### 1. ShareDB 连接失败

**症状**: 连接状态显示为红色
**解决方案**:

- 检查后端服务是否运行
- 确认 WebSocket 连接正常
- 检查网络连接

#### 2. 订阅失败

**症状**: 点击订阅按钮后显示错误
**解决方案**:

- 确保已选择有效的记录
- 检查 ShareDB 连接状态
- 查看浏览器控制台错误信息

#### 3. 实时更新不生效

**症状**: 操作后其他页面没有收到更新
**解决方案**:

- 确认订阅状态为"已订阅"
- 检查 WebSocket 连接
- 验证后端 ShareDB 服务配置

### 调试技巧

#### 1. 查看控制台日志

```javascript
// 打开浏览器开发者工具
// 查看 Console 标签页的日志输出
console.log('[SimpleShareDB] 收到操作:', ops);
```

#### 2. 检查网络连接

```javascript
// 在 Network 标签页中查看 WebSocket 连接
// 确认连接状态为 101 Switching Protocols
```

#### 3. 验证数据格式

```javascript
// 检查发送和接收的数据格式是否正确
// 确认操作路径和值符合预期
```

## 扩展功能

### 1. 添加更多操作类型

```typescript
// 在 SimpleShareDBClient 中添加新的操作类型
const operation = {
  p: ['fields', fieldId],
  oi: newValue,
  od: oldValue, // 支持更新操作
};
```

### 2. 实现字段级订阅

```typescript
// 订阅特定字段的变更
const fieldSubscription = doc.subscribe((ops) => {
  const fieldOps = ops.filter((op) => op.p[0] === 'fields');
  // 处理字段变更
});
```

### 3. 添加冲突解决

```typescript
// 实现操作转换和冲突解决
const transformedOps = transformOperations(localOps, remoteOps);
```

## 性能优化

### 1. 连接管理

- 复用 WebSocket 连接
- 实现连接池管理
- 自动重连机制

### 2. 操作优化

- 批量操作合并
- 操作去重
- 增量更新

### 3. 内存管理

- 及时清理订阅
- 限制文档缓存大小
- 避免内存泄漏

## 最佳实践

### 1. 错误处理

```typescript
try {
  await doc.submitOp(operations);
} catch (error) {
  // 回退到传统 API
  await sdk.updateRecord(tableId, recordId, data);
}
```

### 2. 状态管理

```typescript
// 使用状态管理库管理连接状态
const [connectionState, setConnectionState] = useState('disconnected');
```

### 3. 用户体验

```typescript
// 提供加载状态和错误提示
{isLoading && <LoadingSpinner />}
{error && <ErrorMessage message={error} />}
```

## 总结

这个演示成功展示了如何在 LuckDB 系统中集成 ShareDB 实时协作功能。通过简化的实现和清晰的用户界面，用户可以直观地体验实时数据同步和协作编辑的强大功能。

关键优势：

- ✅ 实时数据同步
- ✅ 多用户协作
- ✅ 操作冲突解决
- ✅ 浏览器兼容
- ✅ 易于使用
- ✅ 可扩展架构

这个实现为 LuckDB 系统提供了与 Airtable、Notion 等现代协作平台相媲美的实时协作能力。
