# 重构组件演示

展示所有新组件的使用方法和最佳实践。

## 目录

1. [Button 组件](#button-组件)
2. [Toast 通知](#toast-通知)
3. [ViewHeader 标签栏](#viewheader-标签栏)
4. [完整示例](#完整示例)

---

## Button 组件

### 基础用法

```tsx
import { Button } from '@luckdb/aitable';
import { Plus, Settings, Filter, Trash } from 'lucide-react';

function ButtonDemo() {
  return (
    <div className="flex gap-2">
      {/* Primary - 主要操作 */}
      <Button variant="primary" icon={Plus}>
        添加记录
      </Button>

      {/* Secondary - 次要操作 */}
      <Button variant="secondary" icon={Settings}>
        设置
      </Button>

      {/* Ghost - 辅助操作 */}
      <Button variant="ghost" icon={Filter}>
        筛选
      </Button>

      {/* Danger - 危险操作 */}
      <Button variant="danger" icon={Trash}>
        删除
      </Button>
    </div>
  );
}
```

### 尺寸

```tsx
<div className="flex items-center gap-2">
  <Button size="sm">小按钮</Button>
  <Button size="md">中按钮</Button>
  <Button size="lg">大按钮</Button>
</div>
```

### Loading 状态

```tsx
function SaveButton() {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveData();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Button 
      variant="primary" 
      loading={saving}
      onClick={handleSave}
    >
      {saving ? '保存中...' : '保存'}
    </Button>
  );
}
```

### 只有图标的按钮

```tsx
import { IconButton } from '@luckdb/aitable';

<div className="flex gap-2">
  <IconButton icon={Plus} variant="primary" />
  <IconButton icon={Settings} variant="ghost" />
  <IconButton icon={MoreHorizontal} variant="ghost" />
</div>
```

### 按钮组

```tsx
import { ButtonGroup, Button } from '@luckdb/aitable';
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

<ButtonGroup>
  <Button icon={AlignLeft} variant="secondary" />
  <Button icon={AlignCenter} variant="secondary" />
  <Button icon={AlignRight} variant="secondary" />
</ButtonGroup>
```

### 全宽按钮

```tsx
<Button variant="primary" fullWidth>
  提交
</Button>
```

---

## Toast 通知

### 设置

首先在应用根部添加 ToastProvider：

```tsx
// App.tsx
import { ToastProvider } from '@luckdb/aitable';

function App() {
  return (
    <ToastProvider>
      <YourApp />
    </ToastProvider>
  );
}
```

### 基础用法

```tsx
import { useToast } from '@luckdb/aitable';

function MyComponent() {
  const toast = useToast();

  const handleAction = () => {
    // 成功
    toast.showToast({
      type: 'success',
      message: '操作成功'
    });

    // 错误
    toast.showToast({
      type: 'error',
      message: '操作失败'
    });

    // 警告
    toast.showToast({
      type: 'warning',
      message: '请注意'
    });

    // 信息
    toast.showToast({
      type: 'info',
      message: '提示信息'
    });
  };
}
```

### 带标题

```tsx
toast.showToast({
  type: 'success',
  title: '保存成功',
  message: '您的更改已成功保存到数据库'
});
```

### 自定义持续时间

```tsx
toast.showToast({
  type: 'error',
  message: '这条消息会显示 5 秒',
  duration: 5000 // 毫秒
});

// 不自动消失
toast.showToast({
  type: 'warning',
  message: '需要手动关闭',
  duration: 0
});
```

### 实战示例：表单保存

```tsx
function SaveForm() {
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (data) => {
    setSaving(true);
    try {
      await api.save(data);
      
      // ✅ 成功提示
      toast.showToast({
        type: 'success',
        title: '保存成功',
        message: '数据已成功保存'
      });
      
      // 返回列表页
      router.push('/list');
    } catch (error) {
      // ❌ 错误提示
      toast.showToast({
        type: 'error',
        title: '保存失败',
        message: error.message || '未知错误'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* 表单字段 */}
      <Button 
        type="submit" 
        variant="primary"
        loading={saving}
      >
        保存
      </Button>
    </form>
  );
}
```

---

## ViewHeader 标签栏

### 静态标签模式

```tsx
import { ViewHeader } from '@luckdb/aitable';

function StaticTabsDemo() {
  const [activeKey, setActiveKey] = useState('table');

  return (
    <ViewHeader
      tabs={[
        { key: 'table', label: '表' },
        { key: 'chart', label: '图表' },
        { key: 'kanban', label: '看板' }
      ]}
      activeTabKey={activeKey}
      onTabChange={setActiveKey}
      onAdd={() => console.log('添加')}
    />
  );
}
```

### 动态视图模式

```tsx
function DynamicViewsDemo() {
  const [views, setViews] = useState([
    { id: '1', name: '全部视图', type: 'grid' },
    { id: '2', name: '我的视图', type: 'grid' },
    { id: '3', name: '已完成', type: 'kanban' }
  ]);
  const [activeViewId, setActiveViewId] = useState('1');

  const handleCreateView = (viewType) => {
    const newView = {
      id: String(Date.now()),
      name: `新视图 ${views.length + 1}`,
      type: viewType
    };
    setViews([...views, newView]);
    setActiveViewId(newView.id);
  };

  return (
    <ViewHeader
      views={views}
      activeViewId={activeViewId}
      onViewChange={setActiveViewId}
      onCreateView={handleCreateView}
      onAdd={() => console.log('添加记录')}
    />
  );
}
```

### 视觉特性

- ✨ 选中标签向上浮起 2px
- ✨ 底部蓝色指示器（2px）
- ✨ 200ms 流畅过渡动画
- ✨ Hover 状态背景变化
- ✨ 支持移动端触摸

---

## 完整示例

### 示例 1：使用 StandardDataView（推荐）

```tsx
import { StandardDataView, ToastProvider } from '@luckdb/aitable';

function App() {
  return (
    <ToastProvider>
      <StandardDataView
        showHeader={true}
        showToolbar={true}
        showStatus={true}
        tabs={[
          { key: 'table', label: '表' },
          { key: 'chart', label: '图表' }
        ]}
        fields={fields}
        toolbarConfig={{
          showAddNew: true,
          showFieldConfig: true,
          showRowHeight: true,
          showFilter: true,
          showSort: true,
          showUndoRedo: true
        }}
        gridProps={{
          columns: columns,
          rowCount: 100,
          getCellContent: getCellContent
        }}
        tableId="table_123"
        sdk={luckdbSdk}
      />
    </ToastProvider>
  );
}
```

### 示例 2：自定义布局

```tsx
import {
  ViewHeader,
  ViewToolbar,
  ViewContent,
  ViewStatusBar,
  ToastProvider,
  Button,
  useToast
} from '@luckdb/aitable';

function CustomLayout() {
  const toast = useToast();

  return (
    <div className="flex flex-col h-screen">
      {/* 标题栏 */}
      <ViewHeader
        tabs={tabs}
        activeTabKey={activeKey}
        onTabChange={setActiveKey}
      />

      {/* 自定义横幅 */}
      <div className="bg-blue-50 px-4 py-2 border-b">
        <p className="text-sm text-blue-700">
          欢迎使用全新的表格系统！
        </p>
      </div>

      {/* 工具栏 */}
      <ViewToolbar
        config={toolbarConfig}
        fields={fields}
        onAddRecord={() => {
          console.log('添加记录');
          toast.showToast({
            type: 'success',
            message: '记录已添加'
          });
        }}
      />

      {/* 内容区 */}
      <div className="flex flex-1 min-h-0">
        {/* 侧边栏 */}
        <div className="w-64 border-r p-4">
          <h3 className="font-semibold mb-2">快捷操作</h3>
          <Button variant="secondary" fullWidth>
            导入数据
          </Button>
          <Button variant="secondary" fullWidth className="mt-2">
            导出数据
          </Button>
        </div>

        {/* 主内容 */}
        <ViewContent
          state="idle"
          gridProps={gridProps}
        />
      </div>

      {/* 状态栏 */}
      <ViewStatusBar recordCount={100}>
        <Button variant="ghost" size="sm">
          刷新
        </Button>
      </ViewStatusBar>
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <CustomLayout />
    </ToastProvider>
  );
}
```

### 示例 3：带反馈的 CRUD 操作

```tsx
function CRUDExample() {
  const toast = useToast();
  const [records, setRecords] = useState([]);

  // 创建
  const handleCreate = async (data) => {
    try {
      const newRecord = await api.create(data);
      setRecords([...records, newRecord]);
      toast.showToast({
        type: 'success',
        message: '记录已添加'
      });
    } catch (error) {
      toast.showToast({
        type: 'error',
        message: '添加失败'
      });
    }
  };

  // 更新
  const handleUpdate = async (id, data) => {
    try {
      await api.update(id, data);
      setRecords(records.map(r => r.id === id ? { ...r, ...data } : r));
      toast.showToast({
        type: 'success',
        message: '记录已更新'
      });
    } catch (error) {
      toast.showToast({
        type: 'error',
        message: '更新失败'
      });
    }
  };

  // 删除
  const handleDelete = async (id) => {
    if (!confirm('确定要删除吗？')) return;

    try {
      await api.delete(id);
      setRecords(records.filter(r => r.id !== id));
      toast.showToast({
        type: 'success',
        message: '记录已删除'
      });
    } catch (error) {
      toast.showToast({
        type: 'error',
        message: '删除失败'
      });
    }
  };

  return (
    <StandardDataView
      gridProps={{
        columns: columns,
        rowCount: records.length,
        getCellContent: (cell) => {
          const [colIndex, rowIndex] = cell;
          const record = records[rowIndex];
          const column = columns[colIndex];
          return {
            type: column.type,
            data: record[column.id],
            displayData: String(record[column.id] || '')
          };
        },
        onCellEdited: (cell, newValue) => {
          const [colIndex, rowIndex] = cell;
          const record = records[rowIndex];
          const column = columns[colIndex];
          handleUpdate(record.id, { [column.id]: newValue });
        }
      }}
      onToolbar={{
        onUndo: () => console.log('撤销'),
        onRedo: () => console.log('重做')
      }}
    />
  );
}
```

---

## 最佳实践

### 1. 始终使用 ToastProvider

```tsx
// ✅ 正确
<ToastProvider>
  <StandardDataView {...props} />
</ToastProvider>

// ❌ 错误（Toast 不会显示）
<StandardDataView {...props} />
```

### 2. 使用正确的 Button 变体

```tsx
// ✅ 正确 - 主要操作用 primary
<Button variant="primary">保存</Button>

// ✅ 正确 - 次要操作用 secondary
<Button variant="secondary">取消</Button>

// ❌ 错误 - 所有按钮都用 primary
<Button variant="primary">保存</Button>
<Button variant="primary">取消</Button>
<Button variant="primary">删除</Button>
```

### 3. 提供有意义的 Toast 消息

```tsx
// ✅ 正确 - 清晰的消息
toast.showToast({
  type: 'success',
  title: '记录已添加',
  message: '新记录"张三"已成功添加到数据库'
});

// ❌ 错误 - 模糊的消息
toast.showToast({
  type: 'success',
  message: '成功'
});
```

### 4. 处理异步操作的 Loading 状态

```tsx
// ✅ 正确
function SaveButton() {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await save();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Button 
      variant="primary" 
      loading={saving}
      disabled={saving}
    >
      保存
    </Button>
  );
}

// ❌ 错误 - 没有 Loading 状态
<Button onClick={save}>保存</Button>
```

---

## 下一步

- 📖 阅读[迁移指南](./MIGRATION_GUIDE_V2.md)
- 🎨 查看[设计系统文档](../src/grid/design-system/README.md)
- 🧪 运行示例项目：`npm run dev`

有问题？欢迎提 Issue 或加入我们的 Discord 社区！

