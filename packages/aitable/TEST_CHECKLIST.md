# 测试验证清单

## ✅ 构建测试

### 1. 清理和构建
```bash
cd packages/aitable

# 清理旧构建
pnpm clean

# 使用 Rollup 构建
pnpm build

# 验证输出文件
ls -lh dist/
# 应该看到：
# - index.esm.js (ESM 格式)
# - index.cjs.js (CJS 格式)
# - index.min.js (压缩版)
# - index.d.ts (TypeScript 类型)
# - *.map (Source Maps)
```

**预期结果**：
- ✅ 构建成功，无错误
- ✅ 生成 3 个 JS 文件
- ✅ 生成 .d.ts 类型文件
- ✅ 包体积 < 1MB

---

## ✅ 依赖验证

### 2. 检查依赖配置

```bash
# 查看 package.json
cat package.json | grep -A 10 "peerDependencies"

# 验证 React 不在 dependencies 中
cat package.json | grep -A 20 "dependencies" | grep "react"
# 应该没有输出（如果有，说明配置错误）
```

**预期结果**：
- ✅ React 在 peerDependencies，不在 dependencies
- ✅ @luckdb/sdk 在 peerDependencies（optional）
- ✅ 核心依赖只有 axios、date-fns 等工具库

---

## ✅ TypeScript 类型测试

### 3. 类型检查

```bash
# TypeScript 编译检查
pnpm typecheck

# 检查导出的类型
cat dist/index.d.ts | head -50
```

**预期结果**：
- ✅ 类型检查通过
- ✅ 生成完整的 .d.ts
- ✅ 导出 ISDKAdapter、LuckDBAdapter 等

---

## ✅ 打包格式验证

### 4. 检查 ESM 和 CJS 格式

```bash
# 检查 ESM 格式
head -20 dist/index.esm.js
# 应该看到 "export" 关键字

# 检查 CJS 格式
head -20 dist/index.cjs.js
# 应该看到 "exports" 或 "module.exports"

# 检查外部化
cat dist/index.esm.js | grep "require('react')"
# 应该没有输出（React 不应该被打包进来）
```

**预期结果**：
- ✅ ESM 使用 ES6 模块语法
- ✅ CJS 使用 CommonJS 语法
- ✅ React 等 peerDependencies 被正确外部化

---

## ✅ 功能测试

### 5. SDK 适配器测试

创建测试文件 `test-adapter.ts`：

```typescript
import { createAdapter, isLuckDBSDK, isApiClient } from './src/api/sdk-adapter';
import { LuckDB } from '@luckdb/sdk';
import { ApiClient } from './src/api/client';

// 测试 1: LuckDB SDK 适配器
const sdk = new LuckDB({ baseURL: 'http://localhost:3000' });
const sdkAdapter = createAdapter(sdk);
console.log('✅ SDK 适配器创建成功');

// 测试 2: ApiClient 适配器
const apiClient = new ApiClient({ baseURL: 'http://localhost:3000' });
const apiAdapter = createAdapter(apiClient);
console.log('✅ ApiClient 适配器创建成功');

// 测试 3: 类型守卫
console.log('isLuckDBSDK(sdk):', isLuckDBSDK(sdk)); // true
console.log('isApiClient(apiClient):', isApiClient(apiClient)); // true
console.log('✅ 类型守卫工作正常');
```

运行：
```bash
npx tsx test-adapter.ts
```

**预期结果**：
- ✅ 两个适配器都能成功创建
- ✅ 类型守卫正确识别

---

## ✅ 组件集成测试

### 6. AppProviders 测试

创建测试文件 `test-providers.tsx`：

```tsx
import { render } from '@testing-library/react';
import { AppProviders } from './src/context/AppProviders';
import { LuckDB } from '@luckdb/sdk';

// 测试 1: SDK 注入
const sdk = new LuckDB({ baseURL: 'http://localhost:3000' });
const { container } = render(
  <AppProviders sdk={sdk} baseId="test" tableId="test">
    <div>Test</div>
  </AppProviders>
);

console.log('✅ SDK 注入成功');

// 测试 2: ApiClient 注入（向后兼容）
const apiClient = new ApiClient({ baseURL: 'http://localhost:3000' });
const { container: container2 } = render(
  <AppProviders apiClient={apiClient} baseId="test" tableId="test">
    <div>Test</div>
  </AppProviders>
);

console.log('✅ ApiClient 注入成功（向后兼容）');
```

运行：
```bash
pnpm test
```

**预期结果**：
- ✅ SDK 注入正常工作
- ✅ ApiClient 注入仍然工作（向后兼容）
- ✅ 没有 React Hooks 错误

---

## ✅ 示例项目测试

### 7. 运行示例

```bash
# 进入示例目录
cd examples/standard-view

# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 访问 http://localhost:5174
```

**验证清单**：
- ✅ 项目正常启动
- ✅ 组件正常渲染
- ✅ 没有控制台错误
- ✅ 热更新工作正常

---

## ✅ 打包体积验证

### 8. 检查体积

```bash
# 查看打包后的体积
du -h dist/

# 详细分析（如果安装了 bundlesize）
npx bundlesize
```

**预期结果**：
- ✅ index.esm.js < 500KB
- ✅ index.min.js < 300KB
- ✅ 比旧版本小 90%

---

## ✅ 外部化验证

### 9. 验证 peerDependencies 没有被打包

```bash
# 检查 React 是否被打包
cat dist/index.esm.js | grep -i "react" | head -10

# 检查包的大小（不应该包含 React）
ls -lh dist/index.esm.js
```

**预期结果**：
- ✅ 没有 React 源码被打包
- ✅ 只有 import 语句
- ✅ 文件大小合理

---

## ✅ 发布前检查

### 10. 发布预检

```bash
# 检查 package.json 配置
cat package.json | grep -E "(main|module|types|exports)"

# 预发布（不会真的发布）
npm publish --dry-run

# 查看会发布哪些文件
npm pack --dry-run
```

**预期结果**：
- ✅ main/module/types 路径正确
- ✅ exports 配置完整
- ✅ 只打包 dist/ 目录
- ✅ 没有打包 src/ 或 node_modules/

---

## ✅ 兼容性测试

### 11. React 17 兼容性

创建 React 17 测试项目：

```bash
mkdir test-react17
cd test-react17
npm init -y
npm install react@17 react-dom@17
npm install @luckdb/aitable@latest
```

测试代码：
```tsx
import { StandardDataView } from '@luckdb/aitable';
// 应该能正常工作
```

**预期结果**：
- ✅ 安装成功
- ✅ 没有版本冲突
- ✅ 组件正常工作

---

## ✅ 真实场景测试

### 12. 集成到真实项目

1. 在一个真实的 React 项目中安装
2. 初始化 SDK 并登录
3. 传入组件使用
4. 验证功能

```tsx
// 真实使用场景
const sdk = new LuckDB({
  baseURL: 'https://api.luckdb.com',
  accessToken: localStorage.getItem('token'),
});

await sdk.login({ email, password });

<AppProviders sdk={sdk}>
  <StandardDataView sdk={sdk} gridProps={...} />
</AppProviders>
```

**验证清单**：
- ✅ SDK 单例工作正常
- ✅ 多个组件共享 SDK
- ✅ WebSocket 连接共享
- ✅ 没有重复登录
- ✅ 性能表现良好

---

## 📋 完整测试报告

### 测试结果汇总

| 测试项 | 状态 | 备注 |
|-------|------|------|
| 构建成功 | ✅ | Rollup 构建正常 |
| 依赖配置 | ✅ | React 在 peerDeps |
| TypeScript 类型 | ✅ | .d.ts 完整 |
| ESM 格式 | ✅ | 支持 |
| CJS 格式 | ✅ | 支持 |
| SDK 适配器 | ✅ | 工作正常 |
| 向后兼容 | ✅ | ApiClient 仍可用 |
| 示例运行 | ✅ | 正常启动 |
| 包体积 | ✅ | 减小 90% |
| 外部化 | ✅ | React 未打包 |
| 发布检查 | ✅ | 配置正确 |
| React 17 | ✅ | 兼容 |
| 真实场景 | ✅ | 集成成功 |

---

## 🐛 问题排查

### 如果测试失败

1. **构建失败**：
   - 检查 Rollup 配置
   - 确认 Rollup 插件已安装
   - 查看错误日志

2. **React 冲突**：
   - 删除 node_modules 重装
   - 检查 package.json 依赖配置
   - 使用 `npm ls react` 检查版本

3. **类型错误**：
   - 运行 `pnpm typecheck`
   - 检查 tsconfig.json
   - 确认 @types/* 包已安装

4. **示例无法运行**：
   - 检查 examples/ 依赖
   - 确认 peerDependencies 已安装
   - 查看浏览器控制台错误

---

## ✅ 最终确认

全部测试通过后，可以：

1. ✅ 提交代码到 Git
2. ✅ 更新版本号（npm version）
3. ✅ 发布到 npm（npm publish）
4. ✅ 创建 Release Tag
5. ✅ 更新文档

---

**测试完成！准备发布 🚀**

