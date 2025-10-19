# 🔧 Grid 列宽调整和拖拽排序功能

## 功能概述

为 `StandardDataView` 组件的 Grid 添加了默认的列宽调整（resize）和拖拽排序（reorder）功能支持。

## ✨ 新增功能

### 1. 列宽调整（Resize）
- **功能**：用户可以通过拖拽列头边界来调整列宽
- **触发方式**：鼠标悬停在列头边界，出现调整光标，拖拽调整宽度
- **默认行为**：记录调整后的列宽，可在控制台查看日志

### 2. 列拖拽排序（Reorder）
- **功能**：用户可以通过拖拽列头来重新排列列的顺序
- **触发方式**：点击并拖拽列头到新位置
- **默认行为**：记录列排序变化，可在控制台查看日志

## 🔧 技术实现

### 1. 列宽调整处理函数

```tsx
const handleColumnResize = useCallback((column: any, newSize: number, colIndex: number) => {
  console.log('🔍 StandardDataView handleColumnResize 被调用:', { column: column.name, newSize, colIndex });
  
  // 如果传入了自定义回调，优先使用
  if (gridProps.onColumnResize) {
    gridProps.onColumnResize(column, newSize, colIndex);
    return;
  }

  // 默认行为：记录列宽调整
  console.log(`📏 列 "${column.name}" 宽度调整为: ${newSize}px`);
}, [gridProps]);
```

### 2. 列排序处理函数

```tsx
const handleColumnOrdered = useCallback((dragColIndexCollection: number[], dropColIndex: number) => {
  console.log('🔍 StandardDataView handleColumnOrdered 被调用:', { dragColIndexCollection, dropColIndex });
  
  // 如果传入了自定义回调，优先使用
  if (gridProps.onColumnOrdered) {
    gridProps.onColumnOrdered(dragColIndexCollection, dropColIndex);
    return;
  }

  // 默认行为：记录列排序变化
  console.log(`🔄 列排序变化: 拖拽列 ${dragColIndexCollection} 到位置 ${dropColIndex}`);
}, [gridProps]);
```

### 3. 传递给 Grid 组件

```tsx
<Grid 
  ref={gridRef} 
  {...gridProps} 
  rowHeight={resolvedRowHeight} 
  onAddColumn={handleGridAddColumn} 
  onEditColumn={onEditColumn} 
  onDeleteColumn={onDeleteColumn}
  onColumnResize={handleColumnResize}      // 新增
  onColumnOrdered={handleColumnOrdered}    // 新增
/>
```

## 🧪 测试方法

### 1. 启动测试环境

```bash
# 构建并启动 demo
cd /Users/leven/space/easy/luckdb/packages/aitable
npm run build

cd demo
npm run dev
```

访问：http://localhost:5176

### 2. 登录并进入表格视图

1. 使用 `admin@126.com` / `Pmker123` 登录
2. 确保进入"表格视图"

### 3. 测试列宽调整功能

1. **找到列头边界**：
   - 将鼠标移动到任意列头的右边界
   - 光标应该变成 `↔` 调整大小样式

2. **调整列宽**：
   - 按住鼠标左键并拖拽
   - 列宽会实时调整
   - 松开鼠标完成调整

3. **验证结果**：
   - 列宽已调整到新大小
   - 控制台显示调整日志：
     ```
     🔍 StandardDataView handleColumnResize 被调用: {column: "姓名", newSize: 150, colIndex: 0}
     📏 列 "姓名" 宽度调整为: 150px
     ```

### 4. 测试列拖拽排序功能

1. **选择要拖拽的列**：
   - 点击任意列头
   - 按住鼠标左键开始拖拽

2. **拖拽到新位置**：
   - 拖拽列头到目标位置
   - 会出现插入位置的指示线
   - 松开鼠标完成排序

3. **验证结果**：
   - 列已移动到新位置
   - 控制台显示排序日志：
     ```
     🔍 StandardDataView handleColumnOrdered 被调用: {dragColIndexCollection: [2], dropColIndex: 0}
     🔄 列排序变化: 拖拽列 [2] 到位置 0
     ```

## 🎯 功能特点

### 1. 零配置支持
- **自动启用**：无需额外配置，默认支持列宽调整和拖拽排序
- **智能降级**：如果传入了自定义回调，优先使用自定义逻辑
- **向后兼容**：不影响现有功能

### 2. 用户体验
- **直观操作**：拖拽调整列宽，拖拽排序列
- **视觉反馈**：调整光标、插入位置指示线
- **实时预览**：拖拽过程中实时显示效果

### 3. 扩展性
- **自定义回调**：支持传入自定义的 `onColumnResize` 和 `onColumnOrdered`
- **持久化支持**：可以轻松添加本地存储或后端 API 调用
- **事件日志**：详细的控制台日志便于调试

## 🔍 调试信息

在浏览器控制台中会看到以下日志：

### 列宽调整日志
```javascript
🔍 StandardDataView handleColumnResize 被调用: {
  column: "姓名",
  newSize: 150,
  colIndex: 0
}
📏 列 "姓名" 宽度调整为: 150px
```

### 列排序日志
```javascript
🔍 StandardDataView handleColumnOrdered 被调用: {
  dragColIndexCollection: [2],
  dropColIndex: 0
}
🔄 列排序变化: 拖拽列 [2] 到位置 0
```

## 🚀 自定义扩展

### 1. 添加持久化存储

```tsx
// 在 handleColumnResize 中添加本地存储
const handleColumnResize = useCallback((column: any, newSize: number, colIndex: number) => {
  // 保存到 localStorage
  const columnWidths = JSON.parse(localStorage.getItem('columnWidths') || '{}');
  columnWidths[column.id] = newSize;
  localStorage.setItem('columnWidths', JSON.stringify(columnWidths));
  
  // 调用后端 API
  if (sdk && tableId) {
    sdk.updateField(tableId, column.id, { width: newSize });
  }
}, [gridProps, sdk, tableId]);
```

### 2. 添加后端 API 调用

```tsx
// 在 handleColumnOrdered 中添加后端调用
const handleColumnOrdered = useCallback(async (dragColIndexCollection: number[], dropColIndex: number) => {
  if (sdk && tableId) {
    try {
      await sdk.updateFieldOrder(tableId, {
        fieldIds: dragColIndexCollection.map(i => columns[i].id),
        targetIndex: dropColIndex
      });
    } catch (error) {
      console.error('列排序保存失败:', error);
    }
  }
}, [gridProps, sdk, tableId, columns]);
```

## 📋 测试清单

- [ ] 列宽调整功能正常
- [ ] 列拖拽排序功能正常
- [ ] 控制台日志正确显示
- [ ] 自定义回调优先使用
- [ ] 不影响其他 Grid 功能
- [ ] 移动端触摸操作正常

## 🔄 与现有功能的集成

| 功能 | 状态 | 说明 |
|------|------|------|
| **添加字段** | ✅ 已支持 | 表头"+"按钮和工具栏 |
| **添加记录** | ✅ 已支持 | 内置弹窗 |
| **列宽调整** | ✅ 新增 | 拖拽列头边界 |
| **列排序** | ✅ 新增 | 拖拽列头 |
| **单元格编辑** | ✅ 已支持 | 双击编辑 |
| **字段配置** | ✅ 已支持 | 字段显示/隐藏 |

## 📚 相关文件

- `packages/aitable/src/components/StandardDataView.tsx` - 主要实现
- `packages/aitable/src/grid/core/Grid.tsx` - Grid 组件
- `packages/aitable/src/grid/hooks/business/useGridColumnResize.ts` - 列宽调整逻辑
- `packages/aitable/src/grid/hooks/business/useGridColumnOrder.ts` - 列排序逻辑

---

**功能版本**: v1.1.3  
**实现时间**: 2025-10-17  
**功能类型**: 交互增强
