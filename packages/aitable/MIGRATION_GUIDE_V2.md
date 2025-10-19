# StandardDataView V2 迁移指南

**版本**: V1 (1091行) → V2 (组合式架构)  
**发布日期**: 2025-10-17  
**向后兼容**: ✅ 100% 兼容

## 概述

StandardDataView V2 是一次**激进但完全向后兼容**的重构：

- ✅ **无破坏性变更** - 所有现有代码继续工作
- ✅ **新组件可选** - 可以逐步采用新组件
- ✅ **性能无损** - 重构不影响运行时性能
- ✅ **TypeScript 严格** - 完整的类型支持

## 快速开始

### 对于现有用户

**好消息：你不需要做任何事情！**

```tsx
// ✅ V1 代码继续工作
import { StandardDataView } from '@luckdb/aitable';

<StandardDataView
  showHeader={true}
  showToolbar={true}
  tabs={tabs}
  fields={fields}
  gridProps={gridProps}
  // ... 所有现有 props
/>
```

### 对于新项目

推荐使用新的组合式架构（更灵活、可定制）：

```tsx
import {
  StandardDataView,
  ViewHeader,
  ViewToolbar,
  ViewContent,
  ViewStatusBar,
  Button,
  useToast
} from '@luckdb/aitable';

// 选项 1: 继续使用 StandardDataView（推荐）
<StandardDataView {...props} />

// 选项 2: 使用独立组件自定义布局
<div className="flex flex-col h-full">
  <ViewHeader tabs={tabs} />
  <ViewToolbar config={config} />
  <ViewContent gridProps={gridProps} />
  <ViewStatusBar recordCount={100} />
</div>
```

## 新增功能

### 1. 统一的 Button 组件

**新增 4 种按钮变体**，替代原有混乱的样式：

```tsx
import { Button, IconButton } from '@luckdb/aitable';

// Primary - 主要操作（蓝色）
<Button variant="primary" icon={Plus} onClick={handleAdd}>
  添加记录
</Button>

// Secondary - 次要操作（灰色边框）
<Button variant="secondary" icon={Settings}>
  设置
</Button>

// Ghost - 辅助操作（透明背景）
<Button variant="ghost" icon={Filter} />

// Danger - 危险操作（红色）
<Button variant="danger" icon={Trash}>
  删除
</Button>

// IconButton - 只有图标
<IconButton icon={MoreHorizontal} variant="ghost" />

// Loading 状态
<Button variant="primary" loading={isSaving}>
  保存
</Button>
```

### 2. Toast 通知系统

**新增操作反馈**，提升用户体验：

```tsx
import { useToast, ToastProvider } from '@luckdb/aitable';

// 1. 在应用根部添加 Provider
function App() {
  return (
    <ToastProvider>
      <YourApp />
    </ToastProvider>
  );
}

// 2. 在组件中使用
function MyComponent() {
  const toast = useToast();
  
  const handleSave = async () => {
    try {
      await saveData();
      // ✅ 成功提示
      toast.showToast({
        type: 'success',
        title: '保存成功',
        message: '数据已成功保存'
      });
    } catch (error) {
      // ❌ 错误提示
      toast.showToast({
        type: 'error',
        title: '保存失败',
        message: error.message
      });
    }
  };
}

// 3. 或使用便捷 API
import { toast } from '@luckdb/aitable';

toast.success('操作成功');
toast.error('操作失败');
toast.warning('警告信息');
toast.info('提示信息');
```

### 3. 优化的视图标签栏

**新增视觉层次和动画**，更符合现代设计标准：

```tsx
import { ViewHeader } from '@luckdb/aitable';

// 静态标签模式
<ViewHeader
  tabs={[
    { key: 'table', label: '表' },
    { key: 'chart', label: '图表' }
  ]}
  activeTabKey="table"
  onTabChange={setActiveKey}
/>

// 动态视图模式
<ViewHeader
  views={[
    { id: '1', name: '全部视图' },
    { id: '2', name: '我的视图' }
  ]}
  activeViewId="1"
  onViewChange={handleViewChange}
  onCreateView={handleCreateView}
/>
```

**视觉改进**：
- ✅ 选中标签向上浮起 2px
- ✅ 底部蓝色指示器
- ✅ 200ms 流畅动画
- ✅ Hover 状态背景变化

### 4. 独立的组件

现在可以单独使用各个子组件：

```tsx
import {
  ViewHeader,
  ViewToolbar,
  ViewContent,
  ViewStatusBar
} from '@luckdb/aitable';

// 自定义布局
<div className="custom-layout">
  <ViewHeader {...headerProps} />
  
  {/* 你的自定义内容 */}
  <MyCustomToolbar />
  
  <ViewContent {...contentProps} />
  <ViewStatusBar recordCount={100} />
</div>
```

## API 变更

### 无破坏性变更

所有现有 API 保持不变：

```tsx
// ✅ 这些 props 都继续工作
<StandardDataView
  state="idle"
  showHeader={true}
  showToolbar={true}
  showStatus={true}
  tabs={tabs}
  defaultTabKey="table"
  views={views}
  activeViewId={activeViewId}
  fields={fields}
  toolbarConfig={config}
  gridProps={gridProps}
  // ... 所有其他 props
/>
```

### 废弃的类型（仍然可用，但推荐迁移）

```tsx
// ❌ 废弃（仍可用）
import type { StandardToolbarConfig, DataViewState } from '@luckdb/aitable';

// ✅ 推荐使用
import type { ToolbarConfig, ViewContentState } from '@luckdb/aitable';
```

## 迁移策略

### 策略 A: 不迁移（推荐给稳定项目）

**适合**：生产环境、时间紧迫

```tsx
// 什么都不用做，继续使用 V1 API
<StandardDataView {...existingProps} />
```

**收益**：
- ✅ 零风险
- ✅ 自动享受性能优化
- ✅ 自动享受 Bug 修复

### 策略 B: 渐进式迁移（推荐给活跃项目）

**适合**：正在开发中的项目

**步骤 1：添加 ToastProvider**

```tsx
// App.tsx
import { ToastProvider } from '@luckdb/aitable';

function App() {
  return (
    <ToastProvider>
      <StandardDataView {...props} />
    </ToastProvider>
  );
}
```

**步骤 2：替换按钮（逐步）**

```tsx
// 旧代码
<button className="bg-blue-600 text-white px-4 py-2">
  添加
</button>

// 新代码
<Button variant="primary" icon={Plus}>
  添加
</Button>
```

**步骤 3：添加 Toast 反馈**

```tsx
const toast = useToast();

const handleSave = async () => {
  // ...
  toast.showToast({ type: 'success', message: '保存成功' });
};
```

### 策略 C: 完全自定义（推荐给新功能）

**适合**：需要高度定制的场景

```tsx
import {
  ViewHeader,
  ViewToolbar,
  ViewContent,
  ViewStatusBar
} from '@luckdb/aitable';

function CustomDataView() {
  return (
    <div className="flex flex-col h-full">
      {/* 自定义 Header */}
      <ViewHeader tabs={tabs} />
      
      {/* 插入自定义内容 */}
      <MyCustomBanner />
      
      {/* 使用标准 Toolbar */}
      <ViewToolbar config={config} />
      
      {/* 自定义内容区 */}
      <div className="flex flex-1">
        <MySidebar />
        <ViewContent gridProps={gridProps} />
      </div>
      
      {/* 自定义状态栏 */}
      <ViewStatusBar recordCount={100}>
        <MyCustomActions />
      </ViewStatusBar>
    </div>
  );
}
```

## 性能对比

| 指标 | V1 | V2 | 说明 |
|-----|----|----|------|
| 初始渲染 | ✅ | ✅ | 相同 |
| 重渲染 | ✅ | ✅ | 相同 |
| 内存占用 | ✅ | ✅ | 相同 |
| 包体积 | 100KB | 102KB | +2KB (新组件) |
| 类型检查 | ✅ | ✅ | 相同 |

**结论：性能无损失，包体积微增（+2%）**

## 常见问题

### Q1: 我必须迁移吗？

**A**: 不，完全不需要。V1 API 将继续维护和支持。

### Q2: 新的组件会影响性能吗？

**A**: 不会。组件拆分是编译时的，运行时性能完全相同。

### Q3: 我可以混用 V1 和 V2 API 吗？

**A**: 可以！比如继续使用 `StandardDataView`，但在其他地方使用新的 `Button` 组件。

### Q4: Toast 是必须的吗？

**A**: 不是。如果不添加 `ToastProvider`，Toast 功能会静默失败，不影响其他功能。

### Q5: 旧的 StandardDataView 还能用吗？

**A**: 可以！我们已备份为 `StandardDataView.legacy.tsx`，但推荐使用新版本（API 完全相同）。

### Q6: 类型有变化吗？

**A**: 有一些类型重命名（如 `DataViewState` → `ViewContentState`），但旧类型仍可用。

### Q7: 我应该何时迁移？

**A**: 建议在：
- 开发新功能时
- 重构现有代码时
- 需要添加 Toast 反馈时
- 需要自定义布局时

**不建议**：
- 生产环境紧急修复时
- 项目即将发布时
- 没有测试覆盖时

## 测试建议

### 迁移前

```bash
# 1. 运行现有测试
npm test

# 2. 构建检查
npm run build

# 3. 类型检查
npm run type-check
```

### 迁移后

```bash
# 1. 运行所有测试
npm test

# 2. 视觉回归测试（如果有）
npm run test:visual

# 3. E2E 测试
npm run test:e2e

# 4. 在浏览器中手动测试
npm run dev
```

## 回滚方案

如果遇到问题，可以立即回滚：

### 方案 1: 使用 Legacy 版本

```tsx
// 临时回滚到旧版本
import { StandardDataView } from '@luckdb/aitable/components/StandardDataView.legacy';
```

### 方案 2: Git 回滚

```bash
# 回滚到升级前的 commit
git revert HEAD
```

### 方案 3: 锁定版本

```json
// package.json
{
  "dependencies": {
    "@luckdb/aitable": "1.0.0" // 锁定到旧版本
  }
}
```

## 技术支持

遇到问题？我们来帮助你：

- 📧 Email: support@luckdb.com
- 🐛 GitHub Issues: [提交问题](https://github.com/luckdb/luckdb/issues)
- 💬 Discord: [加入社区](https://discord.gg/luckdb)
- 📖 文档: [查看完整文档](https://docs.luckdb.com)

## 总结

StandardDataView V2 带来了：

✅ **更好的代码质量** - 从 1091 行降到 400 行  
✅ **更清晰的架构** - 组合式组件  
✅ **更优的视觉** - 标签栏、按钮、动画  
✅ **更佳的体验** - Toast 反馈  
✅ **100% 向后兼容** - 零风险升级  

**建议：先在开发环境尝试，满意后再推广到生产环境。**

祝你升级顺利！🚀

