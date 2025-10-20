# YJS 测试文件说明

本目录包含了专门用于测试 YJS 实时协作功能的示例文件。

## 目标表信息

- **Space ID**: `spc_rtpLk96gJHLeYTv7JJMlo`
- **Base ID**: `7ec1e878-91b9-4c1b-ad86-05cdf801318f` (cms)
- **Table ID**: `tbl_Pweb3NpbtiUb4Fwbi90WP` (blog)
- **Alternative Table ID**: `tbl_6wDmC8NvlsAYZXcBa2XWQ` (rss)

## 测试文件

### 1. `yjs-simple-test.ts` - 简单 YJS 测试
**用途**: 快速测试 YJS 基本功能
**运行**: `bun test:yjs-simple`

**测试内容**:
- 登录和 YJS 连接
- 获取表格和字段信息
- 基本的 YJS 文档操作
- 简单的实时更新测试
- 表格订阅测试

### 2. `yjs-table-operations.ts` - 完整表格操作测试
**用途**: 全面测试 YJS 表格操作功能
**运行**: `bun test:yjs-table`

**测试内容**:
- 完整的 YJS 连接和状态检查
- 表格信息获取和字段列表
- YJS 文档操作
- 表格、记录、字段、视图的实时订阅
- SSE 连接和事件监听
- 批量字段更新
- 传统 API 操作对比
- 连接状态监控

### 3. `yjs-record-operations.ts` - 记录操作测试
**用途**: 专门测试记录的实时创建、更新、删除操作
**运行**: `bun test:yjs-records`

**测试内容**:
- 记录创建和实时监听
- YJS 实时字段更新
- 批量字段更新
- 传统 API 更新对比
- 字段订阅测试
- 记录详情获取
- 测试记录清理

### 4. `yjs-discover-test.ts` - 发现测试
**用途**: 自动发现可用的表格和基础表，然后进行 YJS 测试
**运行**: `bun test:yjs-discover`

**测试内容**:
- 自动发现空间、基础表和表格
- 选择可用的表格进行测试
- 完整的 YJS 功能测试
- 记录创建、更新、删除
- 实时订阅和更新
- 自动清理测试数据

## 环境配置

### 1. 初始化环境配置
```bash
# 创建 .env 文件
bun setup:env
```

### 2. 编辑配置文件
编辑 `examples/.env` 文件，根据你的环境修改配置：
```bash
# API 配置
API_URL=http://localhost:8888
TEST_EMAIL=admin@126.com
TEST_PASSWORD=Pmker123

# 调试配置
DEBUG=true
YJS_ENABLED=true
SSE_ENABLED=true
```

### 3. 配置说明
- 如果不设置目标资源（SPACE_ID, BASE_ID, TABLE_ID），测试会自动发现可用的资源
- 所有配置都有合理的默认值，可以不设置
- 详细配置说明请参考 [ENV_CONFIG_README.md](./ENV_CONFIG_README.md)

## 运行方式

### 单独运行
```bash
# 简单测试
bun test:yjs-simple

# 表格操作测试
bun test:yjs-table

# 记录操作测试
bun test:yjs-records

# 发现测试（推荐）
bun test:yjs-discover
```

### 批量运行
```bash
# 运行所有 YJS 测试
bun test:yjs-all

# 运行所有测试（包括 YJS）
bun test:all
```

## 测试前准备

1. **确保服务器运行**:
   ```bash
   cd /Users/leven/space/b/easydb/server
   make run
   ```

2. **设置测试账户**:
   ```bash
   bun test:setup
   ```

3. **检查配置**:
   - 默认 API URL: `http://localhost:8888`
   - 测试邮箱: `admin@126.com`
   - 测试密码: `Pmker123`

## 测试观察点

### 实时更新观察
- 运行测试时，观察控制台输出的实时更新日志
- 可以在另一个终端运行相同测试，观察多用户协作
- 通过 Web 界面操作表格，观察实时同步

### 连接状态监控
- YJS 连接状态: `connecting` | `connected` | `disconnected`
- SSE 连接状态: `connecting` | `connected` | `disconnected`

### 错误处理
- 如果测试失败，会自动尝试清理资源
- 检查服务器日志以获取详细错误信息
- 确保目标表和字段存在

## 注意事项

1. **测试数据**: 测试会创建和删除临时记录，不会影响现有数据
2. **并发测试**: 可以同时运行多个测试实例来测试多用户协作
3. **网络要求**: 确保网络连接稳定，YJS 需要 WebSocket 连接
4. **浏览器兼容**: YJS 在浏览器和 Node.js 环境中都能正常工作

## 故障排除

### 常见问题

1. **YJS 连接失败**:
   - 检查服务器是否运行
   - 确认 WebSocket 端口可访问
   - 检查防火墙设置

2. **认证失败**:
   - 运行 `bun test:setup` 设置测试账户
   - 检查邮箱和密码配置

3. **表格不存在**:
   - 确认 Base ID 和 Table ID 正确
   - 检查用户是否有访问权限

4. **实时更新不工作**:
   - 检查 YJS 连接状态
   - 确认订阅设置正确
   - 查看服务器日志

### 调试模式

所有测试都启用了调试模式，会输出详细的日志信息。可以通过修改 `config.debug` 来控制日志级别。
