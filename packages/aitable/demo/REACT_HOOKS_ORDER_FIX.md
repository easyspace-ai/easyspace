# 🔧 React Hooks 顺序错误修复

## 🚨 问题描述

Demo 应用在运行时出现 React Hooks 顺序变化错误：

```
Warning: React has detected a change in the order of Hooks called by TableView. 
This will lead to bugs and errors if not fixed.

Previous render: [useContext, useState, useState, useState, useState, useState, useEffect, undefined]
Next render:     [useContext, useState, useState, useState, useState, useState, useEffect, useMemo]

Uncaught Error: Rendered more hooks than during the previous render.
```

## 🔍 问题分析

### 根本原因
在 `TableView` 组件中，`useMemo` Hooks 被放置在条件渲染语句之后：

```typescript
function TableView() {
  // ✅ 正确的 Hooks 调用
  const { sdk, logout } = useSDK();
  const [fields, setFields] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'table' | 'test'>('table');

  // ❌ 条件渲染 - 在 Hooks 之前
  if (isLoading) {
    return <LoadingComponent />;
  }

  if (error) {
    return <ErrorComponent />;
  }

  // ❌ 错误的 Hooks 位置 - 在条件渲染之后
  const columns = useMemo(() => convertFieldsToColumns(fields), [fields]);
  const getCellContent = useMemo(() => createGetCellContent(fields, records), [fields, records]);
}
```

### 问题机制
1. **初始渲染**：组件处于加载状态，条件渲染提前返回，`useMemo` 不被调用
2. **数据加载完成**：组件重新渲染，条件渲染不再触发，`useMemo` 被调用
3. **Hooks 顺序变化**：React 检测到 Hooks 调用顺序不一致，抛出错误

## ✅ 修复方案

### 修复原则
**所有 Hooks 必须在组件的顶层调用，不能在条件语句、循环或嵌套函数中调用。**

### 修复实现

```typescript
function TableView() {
  const { sdk, logout } = useSDK();
  const [fields, setFields] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'table' | 'test'>('table');

  // ✅ 正确的 Hooks 位置 - 在条件渲染之前
  const columns = useMemo(() => convertFieldsToColumns(fields), [fields]);
  const getCellContent = useMemo(() => createGetCellContent(fields, records), [fields, records]);

  // 加载数据
  useEffect(() => {
    // ... 数据加载逻辑
  }, [sdk]);

  // ✅ 条件渲染在 Hooks 之后
  if (isLoading) {
    return <LoadingComponent />;
  }

  if (error) {
    return <ErrorComponent />;
  }

  // 正常渲染逻辑
  return <GridComponent columns={columns} getCellContent={getCellContent} />;
}
```

## 🎯 修复效果

### 修复前
- ❌ Hooks 调用顺序不一致
- ❌ 组件在不同状态下渲染不同的 Hooks
- ❌ React 抛出错误，应用崩溃

### 修复后
- ✅ Hooks 调用顺序一致
- ✅ 所有渲染都调用相同的 Hooks
- ✅ 组件正常工作，无错误

## 📚 React Hooks 规则

### 1. **只在顶层调用 Hooks**
```typescript
// ✅ 正确
function MyComponent() {
  const [state, setState] = useState(0);
  
  if (condition) {
    return <div>Early return</div>;
  }
  
  return <div>{state}</div>;
}

// ❌ 错误
function MyComponent() {
  const [state, setState] = useState(0);
  
  if (condition) {
    const memo = useMemo(() => value, [dep]); // 条件调用
    return <div>Early return</div>;
  }
  
  return <div>{state}</div>;
}
```

### 2. **条件逻辑的正确处理**
```typescript
// ✅ 正确 - 在 Hooks 内部使用条件
const memo = useMemo(() => {
  if (condition) {
    return value1;
  }
  return value2;
}, [condition, dep]);

// ❌ 错误 - 条件调用 Hooks
if (condition) {
  const memo = useMemo(() => value1, [dep]);
} else {
  const memo = useMemo(() => value2, [dep]);
}
```

### 3. **早期返回的处理**
```typescript
// ✅ 正确 - Hooks 在早期返回之前
function MyComponent() {
  const [state, setState] = useState(0);
  const memo = useMemo(() => value, [dep]);
  
  if (!data) {
    return <Loading />;
  }
  
  return <Content state={state} memo={memo} />;
}
```

## 🧪 测试验证

### 测试步骤
1. 启动 demo 应用
2. 观察控制台是否还有 Hooks 错误
3. 测试组件在不同状态下的渲染
4. 验证功能正常工作

### 预期结果
- ✅ 无 React Hooks 错误
- ✅ 组件正常渲染
- ✅ 功能正常工作

## 🔍 预防措施

### 1. **代码审查检查点**
- 所有 Hooks 是否在组件顶层调用
- 是否有条件调用 Hooks 的情况
- 早期返回是否在 Hooks 之后

### 2. **ESLint 规则**
建议启用 `react-hooks/rules-of-hooks` 规则：

```json
{
  "rules": {
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

### 3. **开发工具**
- 使用 React Developer Tools
- 启用 Strict Mode 进行开发
- 定期检查控制台错误

---

**修复版本**: v1.1.8  
**修复时间**: 2025-10-17  
**修复类型**: Bug Fix - React Hooks Rules
