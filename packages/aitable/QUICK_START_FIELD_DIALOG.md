# 🚀 快速开始 - Airtable 风格字段对话框

## 10秒快速体验

```tsx
import { AddFieldDialogV2 } from '@luckdb/aitable/field-config';

function App() {
  const [open, setOpen] = useState(false);
  
  return (
    <>
      <button onClick={() => setOpen(true)}>添加字段</button>
      
      <AddFieldDialogV2
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={(name, type, config) => {
          console.log({ name, type, config });
        }}
      />
    </>
  );
}
```

就这么简单！🎉

## 📖 分步指南

### Step 1: 导入组件

```tsx
import { AddFieldDialogV2 } from '@luckdb/aitable/field-config';
```

### Step 2: 添加状态管理

```tsx
const [isDialogOpen, setIsDialogOpen] = useState(false);
```

### Step 3: 渲染组件

```tsx
<AddFieldDialogV2
  isOpen={isDialogOpen}
  onClose={() => setIsDialogOpen(false)}
  onConfirm={handleCreateField}
/>
```

### Step 4: 处理字段创建

```tsx
const handleCreateField = (name: string, type: string, config?: any) => {
  console.log('创建字段:', { name, type, config });
  
  // 调用你的 API
  // api.createField({ name, type, settings: config });
  
  // 关闭对话框
  setIsDialogOpen(false);
};
```

## 💡 常见场景

### 场景1: 创建"状态"单选字段

用户操作：
1. 点击"添加字段"
2. 搜索"单选"或点击"选择类型"分类
3. 点击"单选"类型
4. 输入字段名："状态"
5. 添加选项：
   - 待处理（红色）
   - 进行中（黄色）
   - 已完成（绿色）
6. 点击"创建字段"

你收到的数据：
```typescript
{
  name: '状态',
  type: 'singleSelect',
  config: {
    options: [
      { id: 'opt-1', label: '待处理', color: '#ef4444' },
      { id: 'opt-2', label: '进行中', color: '#f59e0b' },
      { id: 'opt-3', label: '已完成', color: '#22c55e' },
    ]
  }
}
```

### 场景2: 创建"价格"数字字段

用户操作：
1. 点击"添加字段"
2. 点击"基础类型"分类
3. 选择"数字"类型
4. 输入字段名："价格"
5. 配置：
   - 格式：货币
   - 小数位数：2
   - 最小值：0
6. 点击"创建字段"

你收到的数据：
```typescript
{
  name: '价格',
  type: 'number',
  config: {
    format: 'currency',
    precision: 2,
    min: 0
  }
}
```

## 🎯 完整示例

### React + TypeScript

```tsx
import React, { useState } from 'react';
import { AddFieldDialogV2, type FieldConfig } from '@luckdb/aitable/field-config';
import { toast } from 'sonner'; // 或你的 toast 库

interface Field {
  id: string;
  name: string;
  type: string;
  config?: FieldConfig;
}

function FieldManager() {
  const [fields, setFields] = useState<Field[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateField = async (
    name: string, 
    type: string, 
    config?: FieldConfig
  ) => {
    setIsLoading(true);
    
    try {
      // 调用 API 创建字段
      const response = await fetch('/api/fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type, config }),
      });
      
      if (!response.ok) throw new Error('创建失败');
      
      const newField = await response.json();
      
      // 更新本地状态
      setFields([...fields, newField]);
      
      // 成功提示
      toast.success(`字段 "${name}" 创建成功！`);
      
      // 关闭对话框
      setIsDialogOpen(false);
      
    } catch (error) {
      toast.error('创建字段失败: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button onClick={() => setIsDialogOpen(true)}>
        ➕ 添加字段
      </button>

      {/* 字段列表 */}
      <div>
        {fields.map(field => (
          <div key={field.id}>
            {field.name} ({field.type})
          </div>
        ))}
      </div>

      {/* 字段创建对话框 */}
      <AddFieldDialogV2
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onConfirm={handleCreateField}
      />
      
      {/* 加载状态 */}
      {isLoading && <div>创建中...</div>}
    </div>
  );
}

export default FieldManager;
```

## 🎨 视觉预览

### Step 1: 选择字段类型

```
┌──────────────────────────────────────────┐
│  选择字段类型                          [X]│
│  [🔍 搜索框_______________]              │
│  [全部] [⭐常用] [基础] [选择] [日期]... │
├──────────────────────────────────────────┤
│  📝 基础类型                              │
│  ┌─────────────┐  ┌─────────────┐        │
│  │ 📄  单行文本│  │ 📝  长文本   │        │
│  │ 简短的文本  │  │ 多行文本     │        │
│  └─────────────┘  └─────────────┘        │
│  ...                                      │
└──────────────────────────────────────────┘
```

### Step 2: 配置字段详情

```
┌────────────────────────────────────┐
│  [←] ☑️  单选                    [X]│
├────────────────────────────────────┤
│  字段名称 *                        │
│  [状态________________]             │
│  💡 示例：状态、优先级、类型       │
│                                    │
│  选项列表（单选）                  │
│  🔴 待处理                         │
│  🟡 进行中                         │
│  🟢 已完成                         │
│  [+ 添加选项]                      │
│                                    │
├────────────────────────────────────┤
│               [返回] [✓ 创建字段]  │
└────────────────────────────────────┘
```

## ⌨️ 快捷键

| 按键 | 功能 |
|------|------|
| `Escape` | 关闭对话框 / 返回上一步 |
| `Enter` | 确认创建（在配置界面） |
| `/` | 聚焦搜索框（计划中） |

## 🔧 API 参考

### AddFieldDialogV2 Props

```typescript
interface AddFieldDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (name: string, type: string, config?: FieldConfig) => void;
}
```

### 字段类型 ID

```typescript
type FieldTypeId = 
  | 'text'           // 单行文本
  | 'longText'       // 长文本
  | 'number'         // 数字
  | 'singleSelect'   // 单选
  | 'multipleSelect' // 多选
  | 'checkbox'       // 复选框
  | 'date'           // 日期
  | 'duration'       // 时长
  | 'link'           // 链接
  | 'email'          // 邮箱
  | 'phone'          // 电话
  | 'location'       // 地址
  | 'rating'         // 评分
  | 'progress'       // 进度
  | 'user'           // 成员
  | 'attachment';    // 附件
```

### 字段配置类型

详见 [完整文档](./src/components/field-config/README.md#字段配置类型)

## 🎯 最佳实践

### ✅ DO

```tsx
// 1. 验证字段名称
const handleCreate = (name, type, config) => {
  if (!name.trim()) {
    toast.error('字段名称不能为空');
    return;
  }
  
  createField(name, type, config);
};

// 2. 提供错误处理
try {
  await createField(name, type, config);
  toast.success('创建成功');
} catch (error) {
  toast.error('创建失败: ' + error.message);
}

// 3. 显示加载状态
const [isCreating, setIsCreating] = useState(false);
```

### ❌ DON'T

```tsx
// ❌ 不验证输入
onConfirm={(name, type) => {
  api.createField({ name, type }); // 可能 name 为空
}}

// ❌ 不处理错误
onConfirm={async (name, type) => {
  await api.createField({ name, type }); // 可能失败
}}

// ❌ 创建后不关闭对话框
// （组件会自动关闭，但你可能需要在出错时阻止）
```

## 🐛 常见问题

### Q: 如何禁用某些字段类型？

A: 目前不支持配置禁用字段类型，如需此功能请提 Issue。

### Q: 可以自定义字段类型吗？

A: 可以，参见 [完整文档 - 高级用法](./src/components/field-config/README.md#高级用法)

### Q: 支持国际化吗？

A: 当前仅支持中文，国际化在规划中。

### Q: 移动端体验如何？

A: 基本可用，但尚未完全优化，建议在桌面端使用。

## 📚 更多资源

- [完整 API 文档](./src/components/field-config/README.md)
- [设计系统文档](./src/grid/design-system/README.md)
- [在线演示](./demo/field-dialog-demo.tsx)
- [新旧版本对比](./demo/field-dialog-comparison.tsx)

## 🤝 反馈

如有问题或建议，欢迎提 Issue 或 PR！

---

**享受创建字段的愉悦体验！** ✨

