# 环境配置管理

本目录支持通过 `.env` 文件来管理测试环境配置，让测试更加灵活和可配置。

## 🚀 快速开始

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

### 3. 运行测试
```bash
# 运行发现测试（推荐）
bun test:yjs-discover

# 运行简单测试
bun test:yjs-simple
```

## 📋 配置项说明

### API 配置
- `API_URL`: 服务器地址 (默认: http://localhost:8888)
- `API_TIMEOUT`: API 请求超时时间，毫秒 (默认: 30000)

### 测试账户配置
- `TEST_EMAIL`: 测试账户邮箱 (默认: admin@126.com)
- `TEST_PASSWORD`: 测试账户密码 (默认: Pmker123)

### 目标资源配置（可选）
如果不设置这些配置，测试会自动发现可用的资源：
- `SPACE_ID`: 目标空间 ID
- `BASE_ID`: 目标基础表 ID
- `TABLE_ID`: 目标表格 ID

### 调试配置
- `DEBUG`: 是否开启调试模式 (true/false, 默认: true)
- `VERBOSE_LOGGING`: 是否开启详细日志 (true/false, 默认: false)

### YJS 配置
- `YJS_ENABLED`: 是否启用 YJS (true/false, 默认: true)
- `YJS_DEBUG`: 是否开启 YJS 调试 (true/false, 默认: false)

### SSE 配置
- `SSE_ENABLED`: 是否启用 SSE (true/false, 默认: true)
- `SSE_RECONNECT_INTERVAL`: SSE 重连间隔，毫秒 (默认: 5000)
- `SSE_MAX_RECONNECT_ATTEMPTS`: SSE 最大重连次数 (默认: 10)

### 测试配置
- `TEST_TIMEOUT`: 测试超时时间，毫秒 (默认: 30000)
- `TEST_CLEANUP`: 是否自动清理测试数据 (true/false, 默认: true)
- `TEST_PARALLEL`: 是否并行运行测试 (true/false, 默认: false)

## 🔧 配置管理工具

### 环境管理器
```typescript
import { envManager } from './common/env-manager';

// 创建 .env 文件
envManager.createEnvFile();

// 检查 .env 文件是否存在
const exists = envManager.hasEnvFile();

// 显示帮助信息
envManager.showHelp();
```

### 配置函数
```typescript
import { 
  config, 
  printConfig, 
  getTargetResources, 
  getYjsConfig, 
  getSseConfig 
} from './common/config';

// 打印当前配置
printConfig();

// 获取目标资源
const resources = getTargetResources();

// 获取 YJS 配置
const yjsConfig = getYjsConfig();

// 获取 SSE 配置
const sseConfig = getSseConfig();
```

## 📁 文件结构

```
examples/
├── .env                    # 环境配置文件（需要创建）
├── .env.example           # 环境配置示例文件
├── common/
│   ├── config.ts          # 配置管理
│   ├── env-manager.ts     # 环境管理器
│   └── ...
├── setup-env.ts           # 环境初始化脚本
└── ...
```

## 🎯 使用场景

### 1. 开发环境
```bash
# .env 文件
API_URL=http://localhost:8888
DEBUG=true
YJS_DEBUG=true
```

### 2. 测试环境
```bash
# .env 文件
API_URL=http://test.example.com
DEBUG=false
TEST_CLEANUP=true
```

### 3. 生产环境
```bash
# .env 文件
API_URL=https://api.example.com
DEBUG=false
VERBOSE_LOGGING=false
```

## 🔍 配置验证

配置系统会自动验证配置的有效性：

```typescript
import { envManager } from './common/env-manager';

const validation = envManager.validateConfig(config);
if (!validation.valid) {
  console.error('配置错误:', validation.errors);
}
```

## 🚨 注意事项

1. **安全性**: 不要将 `.env` 文件提交到版本控制系统
2. **默认值**: 所有配置都有合理的默认值，可以不设置
3. **环境变量**: 环境变量会覆盖 `.env` 文件中的配置
4. **类型安全**: 配置系统提供完整的 TypeScript 类型支持

## 🛠️ 故障排除

### 常见问题

1. **找不到 .env 文件**
   ```bash
   bun setup:env
   ```

2. **配置不生效**
   - 检查 `.env` 文件格式
   - 确认没有语法错误
   - 重启测试进程

3. **环境变量冲突**
   - 检查系统环境变量
   - 使用 `printConfig()` 查看当前配置

### 调试技巧

```typescript
// 在测试文件中添加
import { printConfig } from './common/config';

// 打印当前配置
printConfig();
```

## 📚 相关文档

- [YJS 测试文件说明](./YJS_TEST_README.md)
- [SDK 使用文档](../README.md)
