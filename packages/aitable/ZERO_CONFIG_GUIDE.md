# 🎯 零配置全功能指南

## 设计理念

`StandardDataView` 采用"零配置全功能"设计理念：

- **最简配置**：只需传入 `sdk` + `tableId` + `fields`
- **全功能支持**：自动提供添加记录、添加字段、字段配置等所有功能
- **智能降级**：如果传入了自定义回调，则优先使用自定义逻辑

## 🚀 最简配置示例

### Demo 配置（推荐）

```tsx
<StandardDataView
  sdk={sdk}
  tableId={tableId}
  fields={fields}
  showHeader
  showToolbar
  showStatus
  gridProps={{
    columns,
    rowCount: records.length,
    getCellContent,
    onCellEdited,
    onDataRefresh: async () => {
      // 自动刷新逻辑
      const fieldsData = await sdk.listFields({ tableId });
      const recordsData = await sdk.listRecords({ tableId });
      // 更新状态...
    },
  }}
/>
```

### 生产环境配置

```tsx
<StandardDataView
  sdk={luckdb}
  tableId={tableId}
  fields={fields}
  showHeader={false} // 使用自定义头部
  showToolbar
  showStatus
  gridProps={gridProps}
  // 不传任何回调函数，让组件自动处理
/>
```

## ✨ 自动功能

当传入 `sdk` + `tableId` 时，组件自动提供：

### 1. 添加记录功能
- ✅ 自动显示"添加记录"按钮
- ✅ 自动弹出内置 `AddRecordDialog`
- ✅ 自动调用 `sdk.createRecord()`
- ✅ 自动刷新数据（调用 `onDataRefresh`）

### 2. 添加字段功能
- ✅ 自动显示"添加字段"按钮
- ✅ 自动弹出字段配置对话框
- ✅ 自动调用 `sdk.createField()`
- ✅ 自动刷新数据（调用 `onDataRefresh`）

### 3. 字段配置功能
- ✅ 自动显示字段配置下拉框
- ✅ 支持字段显示/隐藏切换
- ✅ 支持字段排序
- ✅ 支持字段编辑/删除

### 4. 数据刷新机制
- ✅ 记录创建后自动刷新
- ✅ 字段创建后自动刷新
- ✅ 单元格编辑后实时更新

## 🔧 自定义覆盖

如果需要自定义行为，可以传入回调函数：

```tsx
<StandardDataView
  sdk={sdk}
  tableId={tableId}
  fields={fields}
  // 自定义添加记录逻辑
  onAdd={() => {
    // 自定义逻辑
  }}
  // 自定义添加字段逻辑
  onAddField={(name, type) => {
    // 自定义逻辑
  }}
  // 自定义字段配置逻辑
  onFieldToggle={(fieldId, visible) => {
    // 自定义逻辑
  }}
  gridProps={gridProps}
/>
```

## 📋 配置对比

| 配置方式 | 代码量 | 功能完整度 | 维护成本 |
|---------|--------|-----------|----------|
| **零配置** | 极少 | 全功能 | 极低 |
| **自定义回调** | 中等 | 全功能+定制 | 中等 |
| **完全自定义** | 很多 | 按需定制 | 高 |

## 🎨 最佳实践

### 1. 新项目推荐
```tsx
// 直接使用零配置，快速启动
<StandardDataView
  sdk={sdk}
  tableId={tableId}
  fields={fields}
  showHeader
  showToolbar
  showStatus
  gridProps={gridProps}
/>
```

### 2. 现有项目迁移
```tsx
// 逐步移除自定义回调，让组件自动处理
<StandardDataView
  sdk={sdk}
  tableId={tableId}
  fields={fields}
  // 先保留关键的自定义逻辑
  onAdd={() => customAddRecord()}
  // 其他功能让组件自动处理
  gridProps={gridProps}
/>
```

### 3. 企业级应用
```tsx
// 结合自定义和自动功能
<StandardDataView
  sdk={sdk}
  tableId={tableId}
  fields={fields}
  // 保留权限控制
  onAdd={hasPermission ? undefined : () => showPermissionDialog()}
  onAddField={hasPermission ? undefined : () => showPermissionDialog()}
  // 其他功能自动处理
  gridProps={gridProps}
/>
```

## 🔍 调试技巧

### 1. 检查自动功能状态
```javascript
console.log('自动功能状态:', {
  hasSDK: !!sdk,
  hasTableId: !!tableId,
  hasFields: !!fields?.length,
  willShowAddRecord: !!(sdk && tableId),
  willShowAddField: !!(sdk && tableId),
});
```

### 2. 监听自动操作
```javascript
// 在浏览器控制台查看自动操作日志
// 查找以下关键词：
// - "🔄 自动刷新数据..."
// - "🛠️ 正在通过适配器创建字段"
// - "✅ 记录创建成功"
```

### 3. 验证数据刷新
```javascript
// 检查 onDataRefresh 是否被正确调用
gridProps.onDataRefresh = async () => {
  console.log('📊 数据刷新被触发');
  // 你的刷新逻辑
};
```

## 🚨 注意事项

1. **SDK 实例**：确保传入的 `sdk` 已正确登录
2. **TableId**：确保 `tableId` 有效且用户有权限
3. **字段格式**：确保 `fields` 数组格式正确
4. **错误处理**：组件会自动处理常见错误，但建议监听控制台日志

## 📚 相关文档

- [AddRecordDialog 完整文档](./src/components/add-record/README.md)
- [字段配置组件文档](./src/components/field-config/README.md)
- [API 适配器文档](./src/api/README.md)
- [Demo 测试指南](./demo/DEMO_TEST_GUIDE.md)

---

**版本**: v1.1.0  
**更新时间**: 2025-10-17  
**设计理念**: 零配置，全功能，智能降级
