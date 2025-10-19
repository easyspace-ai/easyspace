# 🎨 设计系统演示 - 快速上手

> 3 分钟了解如何使用新的设计系统

## 🚀 快速开始

### 1. 使用重构后的 GridToolbar

```tsx
// ✅ 新版本 - 专业图标 + 流畅动画
import { GridToolbar } from '@luckdb/aitable/grid/components/toolbar/GridToolbar.refactored';

function MyGrid() {
  return (
    <>
      <GridToolbar
        onUndo={handleUndo}
        onRedo={handleRedo}
        onAddNew={handleAddNew}
        undoDisabled={!canUndo}
        redoDisabled={!canRedo}
        // ... 其他 props
      />
      <Grid {...gridProps} />
    </>
  );
}
```

**对比效果**：
- ❌ 旧版：Unicode 字符（←、→、⊕）
- ✅ 新版：Lucide React 专业图标（<Undo2 />, <Redo2 />, <Plus />）

### 2. 使用暗色模式

```tsx
import { ThemeProvider, ThemeToggle } from '@luckdb/aitable/grid/design-system';

function App() {
  return (
    <ThemeProvider defaultMode="system">
      <div className="app">
        <header>
          <h1>My App</h1>
          <ThemeToggle />  {/* 一键切换 light/dark */}
        </header>
        
        <Grid />
      </div>
    </ThemeProvider>
  );
}
```

**效果**：
- 自动检测系统主题偏好
- 无闪烁的主题切换
- LocalStorage 持久化

### 3. 使用 Design Tokens

```tsx
import { tokens, cn } from '@luckdb/aitable/grid/design-system';

// 方式 1: 使用 tokens（推荐用于动态值）
const MyCard = () => (
  <div
    style={{
      backgroundColor: tokens.colors.surface.base,
      padding: tokens.spacing[4],
      borderRadius: tokens.radius.lg,
      boxShadow: tokens.elevation.md,
    }}
  >
    Content
  </div>
);

// 方式 2: 使用 Tailwind classes（推荐用于静态样式）
const BetterCard = () => (
  <div
    className={cn(
      'bg-white p-4 rounded-lg shadow-md',
      'transition-all duration-200',
      'hover:shadow-lg hover:scale-[1.02]',
    )}
  >
    Content
  </div>
);
```

### 4. 使用动画

```tsx
import { animations, cn } from '@luckdb/aitable/grid/design-system';

// 进入动画
const Modal = ({ isOpen }) => (
  <div className={cn(
    animations.tailwind.scaleIn,  // 缩放淡入
    'bg-white rounded-lg p-6'
  )}>
    Modal content
  </div>
);

// Hover 效果
const Button = () => (
  <button className={cn(
    'px-4 py-2 rounded-md bg-blue-500 text-white',
    animations.hover.standard,  // 标准 hover 过渡
    animations.focus.standard,  // 标准 focus ring
  )}>
    Click me
  </button>
);
```

## 📊 完整示例

### 带主题切换的完整应用

```tsx
import { 
  ThemeProvider, 
  useTheme, 
  ThemeToggle,
  tokens,
  cn,
  animations,
} from '@luckdb/aitable/grid/design-system';

import { GridToolbar } from '@luckdb/aitable/grid/components/toolbar/GridToolbar.refactored';
import { Grid } from '@luckdb/aitable';

function App() {
  return (
    <ThemeProvider defaultMode="system">
      <AppContent />
    </ThemeProvider>
  );
}

function AppContent() {
  const { theme, isDark } = useTheme();

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: theme.cellBg }}
    >
      {/* Header */}
      <header className={cn(
        'flex items-center justify-between',
        'h-16 px-6 border-b',
      )}
        style={{ borderColor: theme.cellLineColor }}
      >
        <h1 className="text-2xl font-bold">
          My Application
        </h1>
        
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            {isDark ? '🌙 Dark' : '☀️ Light'}
          </span>
          <ThemeToggle className={cn(
            'p-2 rounded-md',
            'hover:bg-gray-100 dark:hover:bg-gray-800',
            'transition-colors duration-200',
          )} />
        </div>
      </header>

      {/* Toolbar */}
      <GridToolbar
        onUndo={() => console.log('Undo')}
        onRedo={() => console.log('Redo')}
        onAddNew={() => console.log('Add')}
        onFilter={() => console.log('Filter')}
        onSort={() => console.log('Sort')}
        onGroup={() => console.log('Group')}
      />

      {/* Grid Container */}
      <div className={cn(
        'flex-1 p-6',
        animations.tailwind.fadeIn,  // 进入动画
      )}>
        <Grid
          theme={theme}
          columns={columns}
          rowCount={100}
          getCellContent={getCellContent}
          onCellEdited={handleCellEdited}
        />
      </div>
    </div>
  );
}

export default App;
```

## 🎯 常用模式

### 1. 自定义按钮

```tsx
const Button = ({ variant = 'primary', children, ...props }) => (
  <button
    className={cn(
      // 基础样式
      'px-4 py-2 rounded-md font-medium',
      'transition-all duration-200 ease-out',
      animations.focus.standard,
      
      // 变体
      variant === 'primary' && [
        'bg-blue-500 text-white',
        'hover:bg-blue-600 active:bg-blue-700',
      ],
      variant === 'secondary' && [
        'bg-gray-100 text-gray-700',
        'hover:bg-gray-200 active:bg-gray-300',
      ],
      variant === 'ghost' && [
        'bg-transparent text-gray-700',
        'hover:bg-gray-100 active:bg-gray-200',
      ],
    )}
    {...props}
  >
    {children}
  </button>
);
```

### 2. 自定义卡片

```tsx
const Card = ({ children, clickable, className, ...props }) => (
  <div
    className={cn(
      'p-6 rounded-lg bg-white border border-gray-200',
      animations.tailwind.scaleIn,  // 进入动画
      
      clickable && [
        'cursor-pointer',
        animations.hover.standard,  // hover 效果
        'hover:shadow-lg hover:border-gray-300',
      ],
      
      className,
    )}
    {...props}
  >
    {children}
  </div>
);
```

### 3. Loading 骨架屏

```tsx
const Skeleton = ({ width, height, className }) => (
  <div
    className={cn(
      animations.loading.skeleton,  // animate-pulse
      'bg-gray-200 dark:bg-gray-700 rounded',
      className,
    )}
    style={{ width, height }}
  />
);

// 使用
<Skeleton width="100%" height="40px" />
<Skeleton width="60%" height="20px" className="mt-2" />
```

## 🎨 颜色参考

### Light Mode

```tsx
// 表面颜色
tokens.colors.surface.base      // #ffffff - 基础背景
tokens.colors.surface.hover     // #f8fafc - hover 状态
tokens.colors.surface.active    // #f1f5f9 - active 状态
tokens.colors.surface.selected  // #e0f2fe - 选中状态

// 文本颜色
tokens.colors.text.primary      // #0f172a - 主要文本
tokens.colors.text.secondary    // #64748b - 次要文本
tokens.colors.text.tertiary     // #94a3b8 - 第三级文本

// 边框颜色
tokens.colors.border.subtle     // #e5e7eb - 微妙边框
tokens.colors.border.default    // #d1d5db - 默认边框
tokens.colors.border.strong     // #9ca3af - 强调边框
tokens.colors.border.focus      // #3b82f6 - 焦点边框
```

### Dark Mode

```tsx
// 表面颜色
tokens.colors.surface.base      // #0a0a0a - 基础背景（不是纯黑）
tokens.colors.surface.hover     // #171717 - hover 状态
tokens.colors.surface.active    // #262626 - active 状态

// 文本颜色
tokens.colors.text.primary      // #f4f4f5 - 主要文本（不是纯白）
tokens.colors.text.secondary    // #a1a1aa - 次要文本
```

## 🚦 迁移清单

从旧版本迁移到新设计系统：

### ✅ Step 1: 更新 imports

```tsx
// ❌ 旧版
import { GridToolbar } from '@luckdb/aitable/grid/components/toolbar';

// ✅ 新版
import { GridToolbar } from '@luckdb/aitable/grid/components/toolbar/GridToolbar.refactored';
```

### ✅ Step 2: 添加 ThemeProvider

```tsx
// 在 App 根组件包裹
import { ThemeProvider } from '@luckdb/aitable/grid/design-system';

<ThemeProvider>
  <App />
</ThemeProvider>
```

### ✅ Step 3: 替换硬编码颜色

```tsx
// ❌ 旧版
style={{ backgroundColor: '#f5f5f5' }}

// ✅ 新版
import { tokens } from '@luckdb/aitable/grid/design-system';
style={{ backgroundColor: tokens.colors.surface.hover }}

// 或者使用 Tailwind
className="bg-gray-50"
```

### ✅ Step 4: 添加动画

```tsx
// ❌ 旧版（无动画）
<div className="bg-white rounded-lg">

// ✅ 新版（流畅动画）
import { cn, animations } from '@luckdb/aitable/grid/design-system';
<div className={cn(
  'bg-white rounded-lg',
  animations.tailwind.scaleIn,
  animations.hover.standard,
)}>
```

## 📚 更多资源

- 📖 **完整文档**: `src/grid/design-system/README.md`
- 🎯 **实现报告**: `book/ai-reports/features/2025-10-16_feature_design_system_implementation.md`
- 🔍 **审查报告**: `book/ai-reports/analysis/2025-10-16_analysis_aitable_ui_ux_audit.md`

## 💬 反馈

有任何问题或建议？欢迎反馈！

---

**享受专业的设计体验！** 🎨✨

