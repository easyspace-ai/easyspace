# Changelog

All notable changes to @luckdb/aitable will be documented in this file.

## [Unreleased]

### Added

- ✨ **内置字段映射功能** (2025-10-17)
  - 新增 `field-mappers.ts` 工具模块，统一处理字段类型转换
  - 支持 30+ 种字段类型的自动映射到 CellType
  - 提供 `createGetCellContent()` 工厂函数 - 自动创建单元格内容获取函数
  - 提供 `convertFieldsToColumns()` - 自动转换字段为列定义
  - 提供 `extractFieldValue()` - 智能提取字段值（支持多种数据结构）
  - 提供 `getFieldIcon()` - 获取字段类型对应的 emoji 图标
  - 提供 `mapFieldTypeToCellType()` - 字段类型到 CellType 映射
  - 智能数据结构解析，自动识别以下 SDK 返回格式：
    - `{ data: [...] }`
    - `{ data: { list: [...] } }`
    - `{ list: [...] }`
    - 直接返回数组 `[...]`

- **AddRecordDialog 组件**：内置的添加记录弹窗
  - 零配置，基于 fields 自动渲染表单
  - 支持 11 种字段类型编辑器
  - 完整的表单校验系统（必填/类型/范围校验）
  - 完美的交互体验（ESC 关闭、Enter 提交、焦点管理）
  - Portal 居中、遮罩、禁用滚动
  - 移动端响应式适配
  - 接入 SDK/ApiClient，保存后自动刷新
  - 支持自定义编辑器、数据转换、国际化

- **字段编辑器组件集**：
  - TextEditor - 单行文本
  - LongTextEditor - 多行文本
  - NumberEditor - 数字
  - BooleanEditor - 布尔/开关
  - DateEditor - 日期
  - SelectEditor - 单选
  - MultiSelectEditor - 多选
  - RatingEditor - 评分
  - LinkEditor - 链接
  - EmailEditor - 邮箱
  - PhoneEditor - 电话

- **StandardDataView 增强**：
  - 新增 `tableId` 属性
  - 新增 `gridProps.onDataRefresh` 回调
  - 内置集成 AddRecordDialog
  - 工具栏"添加记录"按钮默认打开弹窗

- **表单校验系统**：
  - `validateField()` - 单字段校验
  - `validateForm()` - 整表校验
  - `hasErrors()` - 错误检查
  - 支持邮箱、URL、电话等格式校验

### Changed

- 🔧 **优化 useTableData Hook** (2025-10-17)
  - 支持直接传入 `sdk` 参数
  - 支持直接传入 `apiClient` 参数
  - 自动解析多种 records 数据结构
  - 使用内置映射工具，大幅简化代码（从 260+ 行减少到 2 行）

- StandardDataView 的"添加记录"按钮现在打开内置弹窗（原为占位）

### Fixed

- 🐛 **修复 records 显示问题** (2025-10-17)
  - 修复 SDK 返回的 records 数据结构无法正确解析的问题
  - 修复字段映射不正确导致数据显示异常的问题
  - 修复字段值提取位置不统一的问题
  - 修复部分字段类型（如 formula）无法显示的问题

### Documentation

- 📖 新增 `FIELD_MAPPING_GUIDE.md` - 字段映射快速使用指南
- 📋 新增完整功能报告 - `2025-10-17_feature_built_in_field_mapping.md`
- 📝 新增 AddRecordDialog 完整文档
- 📝 新增基础使用示例

## [1.0.0] - 2025-10-15

### 重大重构

- ✅ TypeScript 严格模式启用
- ✅ 从 599 个类型错误降到 0 个
- ✅ Grid.tsx 从 917 行重构到 300 行
- ✅ 完整的错误边界系统
- ✅ 92 个测试用例，100% 通过
- ✅ 完整的可访问性支持

### 性能提升

- 虚拟滚动优化
- Canvas 渲染优化
- 智能缓存机制

### Bug 修复

- 修复所有 undefined 访问问题
- 修复 Field 系统类型错误
- 修复渲染器类型问题

