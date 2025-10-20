/**
 * Grid Table Kanban - Main exports
 * High-performance Grid-based Table and Kanban system
 */

// Core Grid System
export * from "./grid";

// Context System (Application & Data layers)
export { AppProvider } from "./context/app";
export { BaseProvider } from "./context/base";
export { FieldProvider } from "./context/field";
export { PermissionProvider } from "./context/permission";
export { SessionProvider } from "./context/session";
export { TableProvider } from "./context/table";
export { ViewProvider } from "./context/view";
export { AppProviders } from "./context/AppProviders";

// API Client
export * from "./api";

// Data Models
export * from "./model";

// Utilities
export * from "./utils";

// UI (shadcn components)
export * from "./ui";

// Yjs Connection Hook
export * from "./hooks/useYjsConnection";
export * from "./hooks/useTableHeaderSync";
export * from "./hooks/useTableData";

// Composite Components - 使用明确的导出避免冲突
export {
  // 从 components 导出，避免与 model 中的类型冲突
  AddRecordDialog,
  FilterDialog,
  ViewHeader,
  RowHeightCombobox,
  FilterExample,
  ComponentFilterManager,
  FieldManagementProvider,
  useFieldManagement,
  StandardDataView,
} from "./components";

// 导出类型
export type {
  ComponentFilterField,
  ComponentFilterCondition,
  ComponentFilterOperator,
  ViewType as ComponentViewType,
  View as ComponentView,
  FieldConfig,
} from "./components";
