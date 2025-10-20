/**
 * Components Export
 */

export { ColumnManagement } from "../grid/components/column-management/ColumnManagement";
export type { IColumnManagementRef } from "../grid/components/column-management/ColumnManagement";
export { LoadingIndicator } from "../grid/components/ui/LoadingIndicator";

// Field modal exports
export { FieldCreateOrSelectModal } from "../grid/components/field-modal/FieldCreateOrSelectModal";
export { FieldSetting } from "../grid/components/field-modal/FieldSetting";

// Standard composite component
export { StandardDataView } from "./StandardDataView";
export type { StandardDataViewProps, Tab, View } from "./StandardDataView";

// View Header
export { ViewHeader, CreateViewMenu } from "./view-header";
export type { ViewHeaderProps, CreateViewMenuProps } from "./view-header";
// ViewType 类型从 view-header 导出
export type { ViewType } from "./view-header";

// View Toolbar
export { ViewToolbar } from "./view-toolbar";
export type { ViewToolbarProps, ToolbarConfig } from "./view-toolbar";

// View Content
export { ViewContent } from "./view-content";
export type { ViewContentProps, ViewContentState } from "./view-content";

// View StatusBar
export { ViewStatusBar } from "./view-statusbar";
export type { ViewStatusBarProps } from "./view-statusbar";

// Field configuration components
export {
  FieldConfigPanel,
  FieldConfigCombobox,
  AddFieldDialog,
  EditFieldDialog,
  EnhancedEditFieldDialog,
  EnhancedDeleteConfirmDialog,
  FieldManagementProvider,
  useFieldManagement,
} from "./field-config";
export type {
  FieldConfig,
  FieldConfigPanelProps,
  FieldConfigComboboxProps,
  AddFieldDialogProps,
  EditFieldDialogProps,
  EnhancedEditFieldDialogProps,
  EnhancedDeleteConfirmDialogProps,
} from "./field-config";

// Row height components
export { RowHeightCombobox } from "./row-height";
export type { RowHeight, RowHeightComboboxProps } from "./row-height";

// State components
export { LoadingState, EmptyState, ErrorState } from "./states";
export type { EmptyStateProps, ErrorStateProps } from "./states";

// Hooks
export { useTableData } from "../hooks/useTableData";
export type {
  TableDataState,
  UseTableDataOptions,
  CellData,
} from "../hooks/useTableData";

// Add Record Dialog
export { AddRecordDialog } from "./add-record";
export type {
  AddRecordDialogProps,
  FormValues,
  FormErrors,
  FieldEditorProps,
} from "./add-record";

// UI Components
export { Combobox } from "./ui/Combobox";
export type { ComboboxProps, ComboboxOption } from "./ui/Combobox";

// Filter components - 使用明确的导出避免冲突
export {
  FilterDialog,
  FilterExample,
  FilterManager as ComponentFilterManager,
} from "./filter";

// 导出类型
export type {
  FilterField as ComponentFilterField,
  FilterCondition as ComponentFilterCondition,
  FilterOperator as ComponentFilterOperator,
} from "./filter";
