# @luckdb/aitable

> 高性能、类型安全的Airtable-like表格组件库

## ✨ 特性

- 🚀 **高性能**: 虚拟滚动，支持10万+行数据
- 🔒 **类型安全**: TypeScript严格模式，零`any`类型
- 🎨 **现代化**: React 18 + Zustand + Canvas渲染
- 🧪 **可测试**: 90+个测试用例，完整覆盖
- ♿ **可访问性**: 完整ARIA支持，键盘导航
- 🛡️ **错误边界**: 完整的错误处理和恢复机制
- 📦 **Tree-shakable**: ESM格式，按需加载

## 📦 安装

```bash
pnpm add @luckdb/aitable
# or
npm install @luckdb/aitable
# or
yarn add @luckdb/aitable
```

## 🚀 快速开始

### 基础使用

```tsx
import Grid from '@luckdb/aitable';

function App() {
  const columns = [
    { id: 'name', name: '姓名', type: 'text', width: 200 },
    { id: 'age', name: '年龄', type: 'number', width: 100 },
    { id: 'email', name: '邮箱', type: 'email', width: 250 },
  ];

  const getCellContent = (cell) => {
    const [colIndex, rowIndex] = cell;
    return {
      type: 'text',
      data: `Cell ${rowIndex}-${colIndex}`,
      displayData: `Cell ${rowIndex}-${colIndex}`,
    };
  };

  return <Grid columns={columns} rowCount={1000} getCellContent={getCellContent} />;
}
```

### 高级特性

```tsx
import { Grid, GridErrorBoundary } from '@luckdb/aitable';

function AdvancedGrid() {
  return (
    <GridErrorBoundary
      onError={(error, errorInfo) => {
        // 自定义错误处理
        console.error('Grid Error:', error);
      }}
    >
      <Grid
        columns={columns}
        rowCount={rowCount}
        getCellContent={getCellContent}
        // 交互配置
        draggable="all"
        selectable="all"
        isMultiSelectionEnable={true}
        // 主题定制
        theme={{
          fontSize: 14,
          fontFamily: 'Inter',
          cellBg: '#ffffff',
        }}
        // 事件处理
        onCellEdited={(cell, newValue) => {
          console.log('Cell edited:', cell, newValue);
        }}
        onSelectionChanged={(selection) => {
          console.log('Selection changed:', selection);
        }}
        onColumnResize={(colIndex, newWidth) => {
          console.log('Column resized:', colIndex, newWidth);
        }}
      />
    </GridErrorBoundary>
  );
}
```

## 📚 核心概念

### 组件架构

```
Grid (主组件)
├── InfiniteScroller (虚拟滚动)
├── InteractionLayer (交互层)
│   ├── EditorContainer (编辑器)
│   └── SelectionManager (选择管理)
├── RenderLayer (Canvas渲染层)
├── ColumnManagement (列管理)
└── ContextMenu (右键菜单)
```

### 数据流

```
Props → GridState → CoordinateManager → Renderers → Canvas
                  ↓
              Selection → Interaction → Events → Callbacks
```

## 🎨 主题定制

```tsx
const customTheme = {
  // 字体
  fontSize: 14,
  fontSizeSM: 12,
  fontFamily: 'Inter, sans-serif',

  // 颜色
  cellBg: '#ffffff',
  cellBgHover: '#f5f5f5',
  cellBgSelected: '#e3f2fd',
  cellTextColor: '#333333',
  cellLineColor: '#e0e0e0',

  // 尺寸
  rowHeight: 40,
  columnWidth: 150,
  columnHeaderHeight: 40,

  // 图标
  iconSize: 20,
  iconSizeSM: 16,
};

<Grid theme={customTheme} {...props} />;
```

## 🔧 API参考

### Grid Props

| 属性                 | 类型                     | 必需  | 描述           |
| -------------------- | ------------------------ | ----- | -------------- | ------- | ------- | ---------- | ---------- |
| `columns`            | `IGridColumn[]`          | ✅    | 列定义         |
| `rowCount`           | `number`                 | ✅    | 行数           |
| `getCellContent`     | `(cell) => ICell`        | ✅    | 获取单元格内容 |
| `theme`              | `Partial<IGridTheme>`    | ❌    | 主题配置       |
| `draggable`          | `'all'                   | 'row' | 'column'       | 'none'` | ❌      | 可拖拽配置 |
| `selectable`         | `'all'                   | 'row' | 'column'       | 'cell'  | 'none'` | ❌         | 可选择配置 |
| `onCellEdited`       | `(cell, value) => void`  | ❌    | 单元格编辑回调 |
| `onSelectionChanged` | `(selection) => void`    | ❌    | 选择变化回调   |
| `onColumnResize`     | `(index, width) => void` | ❌    | 列调整回调     |

完整API文档: [API.md](./API.md)

## 🧪 测试

```bash
# 运行所有测试
pnpm test

# 运行测试（监听模式）
pnpm test:watch

# 生成覆盖率报告
pnpm test:coverage

# 测试UI
pnpm test:ui
```

## 📖 示例

### 示例1: 基础表格

```tsx
import Grid from '@luckdb/aitable';

const BasicGrid = () => (
  <Grid
    columns={[
      { id: '1', name: 'Name', type: 'text', width: 200 },
      { id: '2', name: 'Age', type: 'number', width: 100 },
    ]}
    rowCount={100}
    getCellContent={(cell) => ({
      type: 'text',
      data: 'Sample',
      displayData: 'Sample',
    })}
  />
);
```

### 示例2: 可编辑表格

```tsx
const EditableGrid = () => {
  const [data, setData] = useState(initialData);

  return (
    <Grid
      columns={columns}
      rowCount={data.length}
      getCellContent={([colIndex, rowIndex]) => {
        const row = data[rowIndex];
        const column = columns[colIndex];
        return {
          type: column.type,
          data: row[column.id],
          displayData: String(row[column.id] || ''),
        };
      }}
      onCellEdited={(cell, newValue) => {
        const [colIndex, rowIndex] = cell;
        setData((prev) => {
          const next = [...prev];
          next[rowIndex][columns[colIndex].id] = newValue;
          return next;
        });
      }}
    />
  );
};
```

更多示例: [examples/](./demo/)

## 🔌 集成

### 与 React Query 集成

```tsx
import { useQuery } from '@tanstack/react-query';
import Grid from '@luckdb/aitable';

function DataGrid() {
  const { data, isLoading } = useQuery({
    queryKey: ['tableData'],
    queryFn: fetchTableData,
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <Grid
      columns={data.columns}
      rowCount={data.records.length}
      getCellContent={([colIndex, rowIndex]) => {
        const record = data.records[rowIndex];
        const column = data.columns[colIndex];
        return {
          type: column.type,
          data: record[column.id],
          displayData: formatCellValue(record[column.id], column.type),
        };
      }}
    />
  );
}
```

### 与 Zustand 集成

```tsx
import { create } from 'zustand';
import Grid from '@luckdb/aitable';

const useTableStore = create((set) => ({
  data: [],
  updateCell: (rowIndex, columnId, value) =>
    set((state) => {
      const next = [...state.data];
      next[rowIndex][columnId] = value;
      return { data: next };
    }),
}));

function ZustandGrid() {
  const { data, updateCell } = useTableStore();

  return (
    <Grid
      columns={columns}
      rowCount={data.length}
      getCellContent={getCellContent}
      onCellEdited={(cell, value) => {
        const [colIndex, rowIndex] = cell;
        updateCell(rowIndex, columns[colIndex].id, value);
      }}
    />
  );
}
```

## 🎯 性能优化

### 虚拟滚动

Grid自动启用虚拟滚动，只渲染可见区域：

```tsx
<Grid
  rowCount={100000} // 支持10万+行
  smoothScrollX={true}
  smoothScrollY={true}
  scrollBufferX={5} // 缓冲区行数
  scrollBufferY={5}
/>
```

### 性能监控

```tsx
import { PerformanceTracker } from '@luckdb/aitable/grid/managers';

const tracker = new PerformanceTracker();

tracker.startMeasure('render');
// ... 渲染逻辑
tracker.endMeasure('render');

console.log('Render time:', tracker.getMetric('render'));
```

## ♿ 可访问性

Grid内置完整的可访问性支持：

- ✅ ARIA标签
- ✅ 键盘导航
- ✅ 屏幕阅读器支持
- ✅ 焦点管理
- ✅ 高对比度主题

详见: [Accessibility Guide](./src/accessibility/README.md)

## 🛡️ 错误处理

Grid内置多层错误边界：

```tsx
// 默认已集成ErrorBoundary
import Grid from '@luckdb/aitable';
<Grid {...props} />; // ✅ 已有错误保护

// 或自定义错误处理
import { GridErrorBoundary } from '@luckdb/aitable';

<GridErrorBoundary
  onError={(error, errorInfo) => {
    Sentry.captureException(error);
  }}
>
  <Grid {...props} />
</GridErrorBoundary>;
```

详见: [Error Handling Guide](./src/grid/error-handling/README.md)

## 📊 类型安全

完整的TypeScript支持：

```tsx
import type { IGridProps, IGridRef, IGridColumn, ICellItem, ICell } from '@luckdb/aitable';

const gridRef = useRef<IGridRef>(null);

<Grid
  ref={gridRef}
  columns={columns}
  rowCount={100}
  getCellContent={(cell: ICellItem): ICell => {
    // 完整的类型提示
  }}
/>;
```

## 🏗️ 架构

### 分层架构

```
┌─────────────────────────────────────┐
│         UI Layer (React)            │
│  Grid / InteractionLayer / Editors │
└──────────────┬──────────────────────┘
               │
┌──────────────┴──────────────────────┐
│      Business Layer (Hooks)         │
│  useGridState / useGridCoordinate  │
└──────────────┬──────────────────────┘
               │
┌──────────────┴──────────────────────┐
│    Rendering Layer (Canvas)         │
│  Renderers / CoordinateManager     │
└──────────────┬──────────────────────┘
               │
┌──────────────┴──────────────────────┐
│       Data Layer (API)              │
│    ApiClient / State Management    │
└─────────────────────────────────────┘
```

### 目录结构

```
src/
├── grid/                    # Grid核心
│   ├── core/               # 核心组件
│   │   ├── Grid.tsx        # 主组件（原始）
│   │   ├── Grid.refactored.tsx  # 简化版
│   │   └── hooks/          # 自定义Hooks
│   ├── components/         # UI组件
│   ├── renderers/          # Canvas渲染器
│   ├── managers/           # 管理器
│   └── hooks/              # 业务Hooks
├── model/                  # 数据模型
│   ├── field/              # 字段系统
│   ├── record/             # 记录模型
│   └── view/               # 视图模型
├── api/                    # API客户端
├── accessibility/          # 可访问性
├── error-handling/         # 错误处理
└── utils/                  # 工具函数
```

## 🤝 贡献

欢迎贡献！请查看 [CONTRIBUTING.md](./CONTRIBUTING.md)

## 📄 许可

MIT © LuckDB

## 🔗 相关链接

- [完整文档](./docs/)
- [API参考](./docs/API.md)
- [示例代码](./demo/)
- [变更日志](./CHANGELOG.md)

## 📈 版本历史

### v1.0.0 (2025-10-15)

#### 🎉 重大重构

- ✅ TypeScript严格模式启用
- ✅ 从599个类型错误降到0个
- ✅ Grid.tsx从917行重构到300行
- ✅ 完整的错误边界系统
- ✅ 92个测试用例，100%通过
- ✅ 完整的可访问性支持

#### 💪 性能提升

- 虚拟滚动优化
- Canvas渲染优化
- 智能缓存机制

#### 🐛 Bug修复

- 修复所有undefined访问问题
- 修复Field系统类型错误
- 修复渲染器类型问题

## 🎓 最佳实践

### 1. 使用GridWithErrorBoundary（默认导出）

```tsx
✅ import Grid from '@luckdb/aitable';
❌ import { Grid } from '@luckdb/aitable'; // 缺少错误保护
```

### 2. 提供完整的getCellContent实现

```tsx
✅ getCellContent={(cell) => ({
  type: 'text',
  data: actualData,
  displayData: formattedData,
  readonly: false,
})}

❌ getCellContent={() => ({})} // 缺少必需字段
```

### 3. 使用TypeScript

```tsx
✅ import type { IGridColumn, ICellItem } from '@luckdb/aitable';

const columns: IGridColumn[] = [...];
const getCellContent = (cell: ICellItem) => {...};
```

### 4. 性能优化

```tsx
// ✅ 缓存getCellContent
const getCellContent = useCallback(
  (cell) => {
    // ...
  },
  [dependencies]
);

// ✅ 使用虚拟滚动
<Grid rowCount={100000} />;

// ❌ 不要在getCellContent中进行复杂计算
```

## ⚡ 性能基准

| 场景 | 行数    | 列数 | 渲染时间 | 滚动FPS |
| ---- | ------- | ---- | -------- | ------- |
| 小型 | 100     | 5    | <50ms    | 60      |
| 中型 | 1,000   | 10   | <100ms   | 60      |
| 大型 | 10,000  | 20   | <200ms   | 60      |
| 超大 | 100,000 | 50   | <500ms   | 55+     |

测试环境: M1 MacBook Pro, Chrome 120

## 🆘 故障排除

### Grid不渲染？

检查：

1. columns数组不为空
2. rowCount > 0
3. getCellContent返回有效对象
4. 容器有明确的width/height

### 性能问题？

优化：

1. 使用useCallback缓存getCellContent
2. 减少不必要的重渲染
3. 启用虚拟滚动
4. 检查数据量

### 类型错误？

确保：

1. 使用TypeScript 5.0+
2. 安装所有类型依赖
3. 检查tsconfig.json配置

## 💬 支持

- 📧 Email: support@luckdb.com
- 🐛 Issues: [GitHub Issues](https://github.com/luckdb/luckdb/issues)
- 💬 Discord: [Join our community](https://discord.gg/luckdb)
