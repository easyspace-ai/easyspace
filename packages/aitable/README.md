# @easyspace/aitable

一个现代化的 Airtable 风格的数据表格组件，专为 EasySpace 框架设计。

## 特性

- 🚀 **高性能**: 基于虚拟化技术，支持大量数据渲染
- 🎨 **现代化设计**: 遵循 EasySpace 设计系统
- 📱 **响应式**: 完美适配各种屏幕尺寸
- 🔧 **高度可定制**: 支持自定义字段类型和组件
- 🎯 **TypeScript**: 完整的类型支持
- 🧪 **测试覆盖**: 全面的单元测试和集成测试

## 安装

```bash
npm install @easyspace/aitable
```

## 快速开始

```tsx
import { Aitable } from '@easyspace/aitable';
import '@easyspace/aitable/dist/index.css';

function App() {
  const data = [
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
  ];

  const columns = [
    { key: 'id', title: 'ID', type: 'number' },
    { key: 'name', title: 'Name', type: 'text' },
    { key: 'email', title: 'Email', type: 'email' },
  ];

  return (
    <Aitable
      data={data}
      columns={columns}
      onDataChange={(newData) => console.log('Data changed:', newData)}
    />
  );
}
```

## 文档

- [快速开始指南](./examples/add-record-basic/README.md)
- [字段映射指南](./src/components/field-config/README.md)
- [API 文档](./src/api/README.md)
- [设计系统](./src/grid/design-system/README.md)

## 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建
npm run build

# 测试
npm run test

# 代码检查
npm run lint
```

## 许可证

MIT
