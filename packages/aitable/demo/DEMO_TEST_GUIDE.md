# Demo 测试指南

## 🎯 测试目标

验证 AddRecordDialog 功能在 demo 中是否正常工作。

## 🚀 启动 Demo

### 1. 启动 aitable 包

```bash
cd /Users/leven/space/easy/luckdb/packages/aitable
npm run build
```

### 2. 启动 demo

```bash
cd /Users/leven/space/easy/luckdb/packages/aitable/demo
npm run dev
```

访问：http://localhost:5173

## 📋 测试步骤

### 步骤 1：登录

1. 打开浏览器访问 demo
2. 使用默认账号登录：
   - 邮箱：`admin@126.com`
   - 密码：`Pmker123`
3. 点击"登录"按钮

### 步骤 2：测试表格视图

1. 登录成功后，默认进入"表格视图"
2. 在工具栏中找到蓝色的"添加记录"按钮
3. 点击按钮
4. 应该会弹出一个对话框

**期望结果**：
- ✅ 弹窗正常显示
- ✅ 表单字段正确渲染
- ✅ 可以输入数据
- ✅ 保存按钮可以点击

### 步骤 3：测试功能测试页面

1. 点击顶部的"功能测试"按钮
2. 点击"🧪 测试添加记录"按钮
3. 测试各种字段类型

**期望结果**：
- ✅ 7 种字段类型都能正常渲染
- ✅ 必填校验正常工作
- ✅ 类型校验正常工作
- ✅ 保存功能正常

## 🔍 调试信息

如果遇到问题，请检查：

### 1. 控制台错误

打开浏览器开发者工具，查看 Console 面板：

```javascript
// 检查组件是否正确加载
console.log('🔍 AddRecordDialog Debug:');
console.log('AddRecordDialog:', typeof AddRecordDialog);

// 检查 StandardDataView 属性
console.log('StandardDataView props:', {
  tableId: config.testBase.tableId,
  hasSDK: !!sdk,
  fieldsCount: fields?.length || 0,
});
```

### 2. 网络请求

在 Network 面板中查看：
- SDK 登录请求是否成功
- 字段和记录加载请求是否成功
- 创建记录请求是否成功

### 3. 组件状态

```javascript
// 在控制台中检查组件状态
console.log('SDK状态:', {
  isLoggedIn: !!sdk,
  token: localStorage.getItem('luckdb_token'),
  baseId: config.testBase.baseId,
  tableId: config.testBase.tableId,
});
```

## 🐛 常见问题

### 1. 点击"添加记录"按钮没有反应

**可能原因**：
- 缺少 `tableId` 属性
- 缺少 `sdk` 属性
- 字段格式不正确

**解决方案**：
检查 `StandardDataView` 是否正确传入：
```tsx
<StandardDataView
  tableId={config.testBase.tableId}  // ✅ 必须传入
  sdk={sdk}                         // ✅ 必须传入
  fields={fields}                   // ✅ 必须传入
  // ...
/>
```

### 2. 弹窗显示但表单为空

**可能原因**：
- `fields` 数组为空或格式不正确

**解决方案**：
```tsx
// 检查字段格式
console.log('Fields:', fields);

// 确保字段格式正确
fields={fields.map((f: any) => ({
  id: f.id,
  name: f.name,
  type: f.type,
  visible: true,
  required: false,
  isPrimary: f.primary || false,
  // ...
}))}
```

### 3. 保存失败

**可能原因**：
- SDK 未正确登录
- 网络连接问题
- 后端服务未启动

**解决方案**：
```javascript
// 检查 SDK 状态
console.log('SDK状态:', {
  isLoggedIn: !!sdk,
  token: localStorage.getItem('luckdb_token'),
});

// 检查网络连接
fetch('http://localhost:8080/health').then(r => console.log('后端状态:', r.status));
```

## ✅ 验证清单

- [ ] Demo 正常启动
- [ ] 登录功能正常
- [ ] 表格视图正常显示
- [ ] "添加记录"按钮可见
- [ ] 点击按钮弹出对话框
- [ ] 表单字段正确渲染
- [ ] 可以输入数据
- [ ] 保存功能正常
- [ ] 功能测试页面正常
- [ ] 7 种字段类型都能测试
- [ ] 无控制台错误

## 📞 获取帮助

如果测试失败，请提供：

1. **浏览器控制台错误截图**
2. **网络请求状态**
3. **具体的错误现象**
4. **复现步骤**

---

**测试时间**: 2025-10-17  
**Demo 版本**: v1.1.0-demo
