# 字段映射快速指南

## 🎯 核心功能

`@luckdb/aitable` 现在内置了完整的字段类型映射功能，自动处理 SDK 返回的数据，无需手动编写映射逻辑。

## ✨ 主要特性

- ✅ **自动字段类型映射** - 支持 30+ 种字段类型
- ✅ **智能数据结构解析** - 自动识别多种 SDK 返回格式
- ✅ **零配置使用** - 开箱即用，无需手动配置
- ✅ **类型安全** - 完整的 TypeScript 类型支持

## 🚀 快速开始

### 方式 1: 使用 `createGetCellContent` 工厂函数

最简单的方式，适用于已有 `fields` 和 `records` 的场景：

```tsx
import { createGetCellContent, convertFieldsToColumns } from '@luckdb/aitable';

function MyTable({ fields, records }) {
  // 自动创建 getCellContent 函数
  const getCellContent = useMemo(() => 
    createGetCellContent(fields, records),
    [fields, records]
  );
  
  // 自动转换字段为列定义
  const columns = useMemo(() => 
    convertFieldsToColumns(fields),
    [fields]
  );
  
  return (
    <StandardDataView
      gridProps={{
        columns,
        rowCount: records.length,
        getCellContent,
      }}
    />
  );
}
```

**优势**: 
- 从 260+ 行手动映射代码简化到 2 行
- 自动处理所有字段类型转换
- 自动生成字段图标

### 方式 2: 使用 `useTableData` Hook

适用于需要从 SDK 加载数据的场景：

```tsx
import { useTableData, StandardDataView } from '@luckdb/aitable';
import luckdb from '@/lib/luckdb';

function TableEditor() {
  const { tableId } = useParams();
  
  // 直接传入 SDK，自动处理所有数据加载和映射
  const {
    columns,
    rowCount,
    getCellContent,
    loading,
    error,
  } = useTableData({
    tableId: tableId!,
    sdk: luckdb,  // 传入已登录的 SDK
    autoLoad: true,
  });
  
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  
  return (
    <StandardDataView
      gridProps={{
        columns,
        rowCount,
        getCellContent,
      }}
    />
  );
}
```

**优势**:
- 自动处理数据加载
- 自动解析 SDK 返回的数据结构
- 自动处理字段映射

### 方式 3: 独立使用映射工具

适用于需要自定义映射逻辑的场景：

```tsx
import {
  convertFieldValueToCell,
  extractFieldValue,
  getFieldIcon,
  mapFieldTypeToCellType,
} from '@luckdb/aitable';

// 提取字段值（自动处理多种数据结构）
const value = extractFieldValue(record, field.id, field.name);
// 支持: record.data[fieldId], record.fields[fieldName], record[fieldId]

// 转换为 Cell 格式
const cell = convertFieldValueToCell(value, field.type, field.options);

// 获取字段图标
const icon = getFieldIcon(field.type); // '📝', '🔢', '📅', ...

// 获取 CellType
const cellType = mapFieldTypeToCellType(field.type);
```

## 📋 支持的字段类型

### 文本类型 → CellType.Text
```
text, singleLineText, longText, string, formula
```

### 数字类型 → CellType.Number
```
number, integer, float, currency, percent, autoNumber, count
```

### 布尔类型 → CellType.Boolean
```
boolean, checkbox, check
```

### 日期类型 → CellType.Date
```
date, datetime, createdTime, lastModifiedTime, timestamp
```

### 选择类型 → CellType.Select
```
单选: select, singleSelect, dropdown, option
多选: multiSelect, multipleSelects, tags, categories
```

### 评分类型 → CellType.Rating
```
rating, star
```

### 用户类型 → CellType.User
```
user, createdBy, lastModifiedBy, owner, assignee
```

### 链接类型 → CellType.Link
```
url, link, hyperlink, attachment, phone, email
```

## 🔧 高级用法

### 自定义字段值提取

```tsx
import { extractFieldValue } from '@luckdb/aitable';

// 支持多种数据结构
const value = extractFieldValue(record, field.id, field.name);

// 优先级：
// 1. record.data[fieldId]
// 2. record.fields[fieldName]
// 3. record[fieldId]
```

### 处理选择字段

```tsx
import { convertFieldValueToCell } from '@luckdb/aitable';

// 单选字段
const cell = convertFieldValueToCell(
  'option1', 
  'singleSelect',
  {
    choices: [
      { id: 'option1', name: '选项1', color: '#3b82f6' },
      { id: 'option2', name: '选项2', color: '#10b981' },
    ]
  }
);

// 多选字段
const cell = convertFieldValueToCell(
  ['option1', 'option2'], 
  'multiSelect',
  {
    choices: [...]
  }
);
```

### 处理日期字段

```tsx
const cell = convertFieldValueToCell(
  '2025-10-17T12:00:00Z',
  'date'
);

// 结果:
// {
//   type: CellType.Date,
//   data: '2025-10-17T12:00:00Z',
//   displayData: '2025/10/17' (中文格式)
// }
```

## 🐛 数据结构容错

组件自动识别和处理以下所有 SDK 返回格式：

```typescript
// ✅ 格式 1: 直接返回数组
const response = [record1, record2, ...];

// ✅ 格式 2: data 为数组
const response = {
  data: [record1, record2, ...],
  total: 100,
};

// ✅ 格式 3: data.list 为数组
const response = {
  data: {
    list: [record1, record2, ...],
    total: 100,
  }
};

// ✅ 格式 4: list 为数组
const response = {
  list: [record1, record2, ...],
  total: 100,
};
```

所有格式都会被自动识别和正确解析！

## 🔄 迁移指南

### 从手动映射迁移

**之前**:
```tsx
// ❌ 需要手动实现 260+ 行的映射逻辑
const getCellContent = useCallback((cell: [number, number]): ICell => {
  const [colIndex, rowIndex] = cell;
  const record = records[rowIndex];
  const field = fields[colIndex];
  
  const value = record.data?.[field.id];
  
  // 大量的 switch case 和类型判断...
  switch (field.type) {
    case 'text':
    case 'singleLineText':
    case 'longText':
      return {
        type: CellType.Text,
        data: value ? String(value) : '',
        displayData: value ? String(value) : '',
      };
    
    case 'number':
    case 'integer':
    // ... 还有很多很多类型要处理
  }
}, [fields, records]);
```

**现在**:
```tsx
// ✅ 只需 1 行！
const getCellContent = useMemo(() => 
  createGetCellContent(fields, records),
  [fields, records]
);
```

### 字段图标迁移

**之前**:
```tsx
const getFieldIcon = useCallback((type: string): string => {
  const iconMap: { [key: string]: string } = {
    text: '📝',
    number: '🔢',
    boolean: '✓',
    // ... 很多映射
  };
  return iconMap[type] || '📄';
}, []);
```

**现在**:
```tsx
import { getFieldIcon } from '@luckdb/aitable';

const icon = getFieldIcon(field.type);
```

### 列定义迁移

**之前**:
```tsx
const gridColumns = useMemo<IGridColumn[]>(() => {
  return fields.map((field, index) => ({
    id: field.id,
    name: field.name,
    width: 150,
    isPrimary: index === 0,
    icon: getFieldIcon(field.type),
  }));
}, [fields, getFieldIcon]);
```

**现在**:
```tsx
import { convertFieldsToColumns } from '@luckdb/aitable';

const gridColumns = useMemo(() => 
  convertFieldsToColumns(fields),
  [fields]
);
```

## 💡 最佳实践

### 1. 使用 useMemo 缓存

```tsx
// ✅ 好的做法
const getCellContent = useMemo(() => 
  createGetCellContent(fields, records),
  [fields, records]
);

// ❌ 不好的做法（每次渲染都重新创建）
const getCellContent = createGetCellContent(fields, records);
```

### 2. 及早返回空状态

```tsx
function MyTable({ fields, records }) {
  // 如果没有数据，及早返回
  if (!fields.length || !records.length) {
    return <EmptyState />;
  }
  
  const getCellContent = useMemo(() => 
    createGetCellContent(fields, records),
    [fields, records]
  );
  
  // ...
}
```

### 3. 处理加载和错误状态

```tsx
function MyTable() {
  const { columns, rowCount, getCellContent, loading, error } = useTableData({
    tableId,
    sdk,
  });
  
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!rowCount) return <EmptyState />;
  
  return <StandardDataView gridProps={{ columns, rowCount, getCellContent }} />;
}
```

## 📚 API 参考

### `createGetCellContent(fields, records)`

创建一个 getCellContent 函数。

**参数**:
- `fields: any[]` - 字段列表
- `records: any[]` - 记录列表

**返回**: `(cell: [number, number]) => ICell`

---

### `convertFieldsToColumns(fields)`

将字段列表转换为列定义。

**参数**:
- `fields: any[]` - 字段列表

**返回**: `Array<{ id, name, width, isPrimary, icon }>`

---

### `convertFieldValueToCell(value, fieldType, fieldOptions?)`

将字段值转换为 Cell 格式。

**参数**:
- `value: any` - 字段值
- `fieldType: string` - 字段类型
- `fieldOptions?: any` - 字段选项（如 choices）

**返回**: `ICell`

---

### `extractFieldValue(record, fieldId, fieldName?)`

从记录中提取字段值。

**参数**:
- `record: any` - 记录对象
- `fieldId: string` - 字段ID
- `fieldName?: string` - 字段名称（可选）

**返回**: `any`

---

### `getFieldIcon(fieldType)`

获取字段类型对应的图标。

**参数**:
- `fieldType: string` - 字段类型

**返回**: `string` (emoji图标)

---

### `mapFieldTypeToCellType(fieldType)`

将字段类型映射为 CellType。

**参数**:
- `fieldType: string` - 字段类型

**返回**: `CellType`

## ❓ 常见问题

### Q: 为什么我的数据显示不出来？

**A**: 检查以下几点：
1. SDK 是否已登录？
2. `tableId` 是否正确？
3. 是否有数据（`records.length > 0`）？
4. 检查浏览器控制台是否有错误

### Q: 如何支持自定义字段类型？

**A**: 可以扩展 `convertFieldValueToCell` 函数：

```tsx
import { convertFieldValueToCell as baseConvert } from '@luckdb/aitable';

function customConvertFieldValueToCell(value, fieldType, options) {
  // 自定义类型处理
  if (fieldType === 'myCustomType') {
    return {
      type: CellType.Text,
      data: processCustomType(value),
      displayData: formatCustomType(value),
    };
  }
  
  // 其他类型使用默认处理
  return baseConvert(value, fieldType, options);
}
```

### Q: 如何调试字段映射？

**A**: 查看浏览器控制台，组件会输出详细的调试信息：

```
🔍 Processing field: 任务名称 (text) with value: "完成报告"
✅ 表格数据加载完成: 任务表 (10/100 条记录)
```

### Q: 性能如何？

**A**: 
- 使用 `useMemo` 缓存，避免重复计算
- 只在 `fields` 或 `records` 变化时重新映射
- 大数据量（1000+ 记录）下性能良好

## 🎓 示例项目

查看完整示例：

```bash
# 查看 page.tsx 的简化示例
apps/manage/src/app/table-editor/page.tsx

# 查看 demo
packages/aitable/demo/src/App.tsx
```

## 📝 更多资源

- [完整功能报告](../../book/ai-reports/features/2025-10-17_feature_built_in_field_mapping.md)
- [字段类型参考](./docs/field-types.md)
- [API 文档](./docs/api.md)

---

**最后更新**: 2025-10-17

