# Standard View 演示应用

这个演示应用展示了如何使用 `@luckdb/aitable` 包的标准数据视图组件。

## 功能特性

### 🎯 双模式支持

1. **演示数据模式** - 使用模拟数据展示组件功能
2. **真实数据模式** - 连接真实的 LuckDB 后端数据

### 📊 演示数据模式

- 15个字段，涵盖多种数据类型
- 250行演示数据，测试性能
- 丰富的交互细节和状态展示
- 完整的状态处理（加载、空、错误）

### 🔗 真实数据模式

- 连接 LuckDB 后端 API
- 完整的 CRUD 操作
- 实时数据同步
- 错误处理和加载状态

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 启动演示

```bash
pnpm run dev
```

### 3. 访问应用

打开浏览器访问 `http://localhost:5173`

## 配置真实数据模式

### 1. 启动 LuckDB 服务器

确保 LuckDB 服务器正在运行：

```bash
# 在项目根目录
npm run server
```

默认地址：`http://localhost:8080`

### 2. 获取认证令牌

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email", "password": "your-password"}'
```

### 3. 获取表格 ID

```bash
curl -X GET http://localhost:8080/api/v1/base/{baseId}/table \
  -H "Authorization: Bearer {your-token}"
```

### 4. 设置环境变量

创建 `.env` 文件：

```env
REACT_APP_LUCKDB_URL=http://localhost:8080
REACT_APP_LUCKDB_TOKEN=your-access-token
REACT_APP_LUCKDB_TABLE_ID=your-table-id
```

### 5. 重启开发服务器

```bash
pnpm run dev
```

## 使用说明

### 切换数据模式

在应用顶部的工具栏中，点击"数据模式"按钮：

- **演示数据** - 使用模拟数据，可以切换不同状态查看 UI 效果
- **真实数据** - 连接 LuckDB 后端，需要正确配置

### 配置状态指示

真实数据模式下，顶部会显示配置状态：

- ✅ **已认证** - 认证令牌有效
- ❌ **未认证** - 需要设置认证令牌
- ✅ **表格已选择** - 表格 ID 已配置
- ❌ **未选择表格** - 需要设置表格 ID

### 错误处理

如果配置不正确，应用会显示错误状态，并提供：

- 详细的错误信息
- 配置说明链接
- 返回演示数据的选项

## 技术架构

### API 集成

项目使用现有的 API 集成架构：

- **SDK 适配器** (`SDKAdapter`) - 基于 `@luckdb/sdk`
- **数据 Hook** (`useTableData`) - 封装数据获取逻辑
- **类型系统** - 完整的 TypeScript 类型支持

### 组件结构

```
src/
├── App.tsx              # 主应用，支持双模式切换
├── RealDataApp.tsx      # 真实数据模式应用
├── demoData.ts          # 演示数据生成器
├── config.ts            # 配置文件
└── README.md           # 说明文档
```

### 数据流

1. **配置验证** - 检查必要的连接参数
2. **API 客户端** - 使用 SDK 适配器连接后端
3. **数据获取** - 并行获取表格、字段、记录数据
4. **数据转换** - 将后端数据转换为组件格式
5. **状态管理** - 处理加载、错误、空状态
6. **实时更新** - 支持 CRUD 操作和实时同步

## 开发指南

### 添加新功能

1. 在 `useTableData` Hook 中添加新的数据操作
2. 在 `RealDataApp` 中集成新的 UI 交互
3. 更新类型定义和错误处理

### 自定义配置

修改 `config.ts` 文件来自定义：

- 默认服务器地址
- 认证方式
- 数据获取参数
- 错误处理逻辑

### 调试技巧

1. 打开浏览器开发者工具查看网络请求
2. 检查控制台中的配置信息和错误日志
3. 使用演示数据模式测试 UI 功能
4. 使用真实数据模式测试 API 集成

## 故障排除

### 常见问题

1. **连接失败**
   - 检查 LuckDB 服务器是否运行
   - 验证 baseURL 配置是否正确

2. **认证失败**
   - 检查 token 是否有效
   - 验证用户权限

3. **表格不存在**
   - 检查 tableId 是否正确
   - 验证用户是否有访问权限

4. **数据格式错误**
   - 检查字段类型映射
   - 验证数据转换逻辑

### 获取帮助

- 查看控制台中的详细错误信息
- 检查网络请求的响应内容
- 参考 LuckDB SDK 文档
- 查看项目中的类型定义

## 许可证

MIT License