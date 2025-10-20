/**
 * StandardDataView - 标准数据视图组件（重构版）
 *
 * 从 1091 行重构到 < 250 行
 *
 * 设计原则：
 * 1. 组合式架构 - 每个区域独立组件
 * 2. 清晰的职责分离
 * 3. 易于测试和维护
 * 4. 向后兼容 API
 *
 * 架构：
 * StandardDataView (orchestrator)
 *   ├── ViewHeader (标签栏)
 *   ├── ViewToolbar (工具栏)
 *   ├── ViewContent (内容区)
 *   └── ViewStatusBar (状态栏)
 */

import React, {
  useMemo,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { cn } from "../grid/design-system";
import { ViewHeader } from "./view-header";
import { ViewToolbar, type ToolbarConfig } from "./view-toolbar";
import { ViewContent, type ViewContentState } from "./view-content";
import { ViewStatusBar } from "./view-statusbar";
import { getDeviceType, isTouchDevice } from "./utils/responsive";
import { createAdapter } from "../api/sdk-adapter";
import type { IGridProps, IGridRef } from "../grid/core/Grid";
import type { EmptyStateProps, ErrorStateProps } from "./states";
import type { FieldConfig } from "./field-config";
import type { RowHeight } from "./row-height";
import type {
  FilterField,
  FilterCondition as FilterConditionType,
} from "./filter/FilterDialog";
import { AddFieldDialogV2, EditFieldDialog } from "./field-config";
import { AddRecordDialog } from "./add-record";
import { useToast } from "../ui/Toast";
import { useTableHeaderSync } from "../hooks/useTableHeaderSync";

// ==================== 类型定义 ====================

export interface Tab {
  key: string;
  label: string;
}

export interface View {
  id: string;
  name: string;
  type?: string;
}

export interface StandardDataViewProps {
  // 状态
  state?: ViewContentState;
  loadingMessage?: string;
  emptyStateProps?: EmptyStateProps;
  errorStateProps?: ErrorStateProps;

  // 区域显示控制
  showHeader?: boolean;
  showToolbar?: boolean;
  showStatus?: boolean;

  // Header - 标签或视图
  tabs?: Tab[];
  defaultTabKey?: string;
  onAdd?: () => void;

  views?: View[];
  activeViewId?: string;
  onViewChange?: (viewId: string) => void;
  onCreateView?: (viewType: string) => void;
  onRenameView?: (viewId: string, newName: string) => void;
  onDeleteView?: (viewId: string) => void;

  // API 客户端
  apiClient?: any;
  sdk?: any;
  tableId?: string;

  // 字段配置
  fields?: FieldConfig[];
  onFieldToggle?: (fieldId: string, visible: boolean) => void;
  onFieldReorder?: (fromIndex: number, toIndex: number) => void;
  onFieldEdit?: (fieldId: string) => void;
  onFieldDelete?: (fieldId: string) => void;
  onFieldGroup?: (fieldId: string) => void;
  onFieldCopy?: (fieldId: string) => void;
  onFieldInsertLeft?: (fieldId: string) => void;
  onFieldInsertRight?: (fieldId: string) => void;
  onFieldFilter?: (fieldId: string) => void;
  onFieldSort?: (fieldId: string) => void;
  onFieldFreeze?: (fieldId: string) => void;
  onAddField?: (fieldName: string, fieldType: string) => void;
  onAddColumn?: (
    fieldType: string,
    insertIndex?: number,
    fieldName?: string,
    options?: any,
  ) => void;
  onEditColumn?: (columnIndex: number, updatedColumn: any) => void;
  onDeleteColumn?: (columnIndex: number) => void;
  onUpdateField?: (fieldName: string, fieldType: string) => void;
  fieldConfigMode?: "panel" | "combobox";

  // 行高配置
  rowHeight?: RowHeight;
  onRowHeightChange?: (rowHeight: RowHeight) => void;

  // 过滤配置
  filterFields?: FilterField[];
  filterConditions?: FilterConditionType[];
  onFilterConditionsChange?: (conditions: FilterConditionType[]) => void;
  onFilteredDataChange?: (filteredData: any[]) => void;

  // 工具栏配置
  toolbarConfig?: ToolbarConfig;
  onToolbar?: {
    onUndo?: () => void;
    onRedo?: () => void;
    onFilter?: () => void;
    onSort?: () => void;
    onGroup?: () => void;
  };

  // Grid 配置
  gridProps: IGridProps & {
    onDataRefresh?: () => void;
  };

  // 状态栏
  statusContent?: React.ReactNode;

  className?: string;
  style?: React.CSSProperties;

  // 可选：启用 Yjs 表头同步配置
  syncHeader?: {
    tableId: string;
    userId: string;
    token?: string;
    endpoint?: string;
    debug?: boolean;
    baseUrl?: string;
  };
}

// ==================== 默认值 ====================

const DEFAULT_TABS: Tab[] = [
  { key: "table", label: "表" },
  { key: "chart", label: "示图" },
];

// ==================== 主组件 ====================

export function StandardDataView(props: StandardDataViewProps) {
  const {
    state = "idle",
    loadingMessage,
    emptyStateProps,
    errorStateProps,
    showHeader = true,
    showToolbar = true,
    showStatus = true,
    tabs = DEFAULT_TABS,
    defaultTabKey = "table",
    onAdd,
    views,
    activeViewId,
    onViewChange,
    onCreateView,
    // 新增：视图重命名/删除（可选，未提供则走内置默认实现）
    onRenameView,
    onDeleteView,
    apiClient,
    sdk,
    tableId,
    fields,
    onFieldToggle,
    onFieldReorder,
    onFieldEdit,
    onFieldDelete,
    onFieldGroup,
    onFieldCopy,
    onFieldInsertLeft,
    onFieldInsertRight,
    onFieldFilter,
    onFieldSort,
    onFieldFreeze,
    onAddField,
    onAddColumn,
    onEditColumn,
    onDeleteColumn,
    onUpdateField,
    fieldConfigMode = "combobox",
    rowHeight: controlledRowHeight = "medium",
    onRowHeightChange,
    filterFields,
    filterConditions = [],
    onFilterConditionsChange,
    onFilteredDataChange,
    toolbarConfig,
    onToolbar,
    gridProps,
    statusContent,
    className,
    style,
  } = props;

  // ==================== State ====================

  const gridRef = useRef<IGridRef>(null);
  const [activeKey, setActiveKey] = useState<string>(defaultTabKey);
  const [deviceType, setDeviceType] = useState<"mobile" | "tablet" | "desktop">(
    "desktop",
  );
  const [isTouch, setIsTouch] = useState(false);
  const [rowHeightState, setRowHeightState] =
    useState<RowHeight>(controlledRowHeight);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [columnOrder, setColumnOrder] = useState<number[]>([]);
  const [columnMeta, setColumnMeta] = useState<any[]>([]);

  // 对话框状态
  const [showAddFieldDialog, setShowAddFieldDialog] = useState(false);
  const [showEditFieldDialog, setShowEditFieldDialog] = useState(false);
  const [showAddRecordDialog, setShowAddRecordDialog] = useState(false);
  const [editingField, setEditingField] = useState<FieldConfig | null>(null);

  // 🎉 内部视图管理状态
  const [internalViews, setInternalViews] = useState<View[]>([]);
  const [internalActiveViewId, setInternalActiveViewId] = useState<string>("");
  const [viewsLoading, setViewsLoading] = useState(false);

  const toast = useToast();

  // 🎉 计算最终使用的视图数据（提前定义，供 useTableHeaderSync 使用）
  const finalViews = useMemo(() => {
    return views && views.length > 0 ? views : internalViews;
  }, [views, internalViews]);

  const finalActiveViewId = useMemo(() => {
    return activeViewId || internalActiveViewId;
  }, [activeViewId, internalActiveViewId]);

  // ==================== Header Sync (Yjs) ====================
  const { sendColumnOrder, sendColumnWidth } = useTableHeaderSync(
    useMemo(() => {
      if (!props.syncHeader) {
        // 传入空配置，内部不会真正连接，但保持类型安全
        return {
          tableId: "",
          viewId: undefined,
          userId: "",
          onColumnOrder: undefined,
          onColumnWidth: undefined,
        } as any;
      }

      // 将服务端 Yjs 推送转换为本地 UI 状态
      const onColumnOrder = (orderIds: string[]) => {
        if (!gridProps.columns || gridProps.columns.length === 0) return;
        const idToIndex: Record<string, number> = {};
        gridProps.columns.forEach((col, idx) => {
          if (col && typeof col.id === "string") {
            idToIndex[col.id] = idx;
          }
        });
        const newOrder: number[] = orderIds
          .map((id) => idToIndex[id])
          .filter((idx): idx is number => typeof idx === "number");
        if (newOrder.length > 0) {
          setColumnOrder(newOrder);
        }
      };

      const onColumnWidth = (widths: Record<string, number>) => {
        // 过滤掉 key 为空的情况，避免 undefined 作为索引
        const sanitized: Record<string, number> = {};
        Object.keys(widths || {}).forEach((k) => {
          if (k) sanitized[k] = widths[k]!;
        });
        if (Object.keys(sanitized).length > 0) {
          setColumnWidths((prev) => ({ ...prev, ...sanitized }));
        }
      };

      return {
        tableId: props.syncHeader.tableId,
        viewId: finalActiveViewId,
        userId: props.syncHeader.userId,
        token: props.syncHeader.token,
        endpoint: props.syncHeader.endpoint,
        debug: props.syncHeader.debug,
        baseUrl: props.syncHeader.baseUrl,
        onColumnOrder,
        onColumnWidth,
      };
    }, [props.syncHeader, gridProps.columns, finalActiveViewId]),
  );

  // ==================== Effects ====================

  // 加载视图配置（包括列配置）
  useEffect(() => {
    const loadViewConfig = async () => {
      if (!tableId || !(sdk || apiClient)) return;

      const currentViewId = activeViewId || internalActiveViewId;
      if (!currentViewId) return;

      try {
        const adapter = createAdapter(sdk || apiClient);
        const view = await adapter.getView(tableId, currentViewId);

        if (view && view.columnMeta) {
          console.log("📋 加载视图列配置:", view.columnMeta);

          // 将 Record 格式转换为数组格式
          const columnMetaArray = Object.entries(view.columnMeta).map(
            ([fieldId, meta]) => ({
              fieldId,
              ...meta,
            }),
          );
          setColumnMeta(columnMetaArray);

          // 同时更新列宽状态
          const widths: Record<string, number> = {};
          columnMetaArray.forEach((col: any) => {
            if (col.fieldId && col.width) {
              widths[col.fieldId] = col.width;
            }
          });
          setColumnWidths(widths);
        }
      } catch (error) {
        console.warn("⚠️ 加载视图配置失败:", error);
      }
    };

    loadViewConfig();
  }, [tableId, sdk, apiClient, activeViewId, internalActiveViewId]);

  // 检测设备类型
  useEffect(() => {
    const updateDeviceType = () => {
      setDeviceType(getDeviceType());
      setIsTouch(isTouchDevice());
    };
    updateDeviceType();
    window.addEventListener("resize", updateDeviceType);
    return () => window.removeEventListener("resize", updateDeviceType);
  }, []);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, []);

  // 行高同步
  useEffect(() => {
    setRowHeightState(controlledRowHeight);
  }, [controlledRowHeight]);

  // 🎉 自动加载视图数据
  useEffect(() => {
    if (!tableId || !(sdk || apiClient)) return;

    const loadViews = async () => {
      try {
        setViewsLoading(true);
        const adapter = createAdapter(sdk || apiClient);
        const viewsList = await adapter.getViews(tableId as string);

        setInternalViews(viewsList);

        // 如果外部没有指定 activeViewId，使用第一个视图
        if (!activeViewId && viewsList.length > 0 && viewsList[0]?.id) {
          setInternalActiveViewId(viewsList[0].id as string);
        }

        console.log("✅ 视图数据自动加载完成:", {
          viewsCount: viewsList.length,
          activeViewId:
            activeViewId || (viewsList[0]?.id as string | undefined),
        });
      } catch (error) {
        console.error("❌ 加载视图数据失败:", error);
        toast.showToast({ type: "error", message: "加载视图数据失败" });
      } finally {
        setViewsLoading(false);
      }
    };

    loadViews();
  }, [tableId, sdk, apiClient, activeViewId, toast]);

  // 🎉 同步外部 activeViewId
  useEffect(() => {
    if (activeViewId) {
      setInternalActiveViewId(activeViewId);
    }
  }, [activeViewId]);

  // ==================== Handlers ====================

  // 🎉 内部视图切换处理
  const handleInternalViewChange = useCallback(
    async (viewId: string) => {
      if (onViewChange) {
        onViewChange(viewId);
        return;
      }

      // 默认实现：更新内部状态
      setInternalActiveViewId(viewId);
      toast.showToast({ type: "info", message: "视图切换成功" });
    },
    [onViewChange, toast],
  );

  // 🎉 内部视图创建处理
  const handleInternalCreateView = useCallback(
    async (viewType: string) => {
      if (onCreateView) {
        onCreateView(viewType);
        return;
      }

      try {
        if (!tableId || !(sdk || apiClient)) {
          console.error("❌ 缺少 sdk/apiClient 或 tableId");
          return;
        }

        const adapter = createAdapter(sdk || apiClient);
        const defaultNameBase = viewType === "grid" ? "表格视图" : "看板视图";

        // 智能命名
        const existingViewsOfType = internalViews.filter((v) => {
          if (v.type !== viewType) return false;
          const pattern = new RegExp(`^${defaultNameBase} \\d+$`);
          return pattern.test(v.name);
        });

        const existingNumbers = existingViewsOfType
          .map((v) => {
            const match = v.name.match(
              new RegExp(`^${defaultNameBase} (\\d+)$`),
            );
            return match ? parseInt(match[1], 10) : 0;
          })
          .filter((num) => num > 0)
          .sort((a, b) => a - b);

        let nextIndex = 1;
        for (const num of existingNumbers) {
          if (num === nextIndex) {
            nextIndex++;
          } else {
            break;
          }
        }

        const name = `${defaultNameBase} ${nextIndex}`;

        const newView = await adapter.createView(String(tableId), {
          tableId: String(tableId),
          name,
          type: viewType as any,
        });

        // 更新内部视图列表
        setInternalViews((prev) => [...prev, newView]);
        setInternalActiveViewId(newView.id as string);

        toast.showToast({
          type: "success",
          message: `已创建${name}并自动切换`,
        });
      } catch (error) {
        console.error("❌ 创建视图失败:", error);
        toast.showToast({ type: "error", message: "创建视图失败" });
      }
    },
    [onCreateView, sdk, apiClient, tableId, internalViews, toast],
  );

  // 🎉 内部视图重命名
  const handleInternalRenameView = useCallback(
    async (viewId: string, newName: string) => {
      if (onRenameView) {
        onRenameView(viewId, newName);
        return;
      }
      try {
        if (!tableId || !(sdk || apiClient)) return;
        const adapter = createAdapter(sdk || apiClient);
        const updated = await adapter.updateView(
          tableId as string,
          viewId as string,
          { name: newName } as any,
        );
        setInternalViews((prev) =>
          prev.map((v) => (v.id === viewId ? updated : v)),
        );
        toast.showToast({ type: "success", message: "重命名成功" });
      } catch (e) {
        console.error("❌ 重命名视图失败:", e);
        toast.showToast({ type: "error", message: "重命名失败" });
      }
    },
    [onRenameView, sdk, apiClient, tableId, toast],
  );

  // 🎉 内部视图删除
  const handleInternalDeleteView = useCallback(
    async (viewId: string) => {
      if (onDeleteView) {
        onDeleteView(viewId);
        return;
      }
      try {
        if (!tableId || !(sdk || apiClient)) return;
        const adapter = createAdapter(sdk || apiClient);
        await adapter.deleteView(tableId as string, viewId);
        setInternalViews((prev) => prev.filter((v) => v.id !== viewId));
        // 若删除的是当前视图，切换到第一个
        setInternalActiveViewId((prev) =>
          prev === viewId ? internalViews[0]?.id || "" : prev,
        );
        toast.showToast({ type: "success", message: "已删除视图" });
      } catch (e) {
        console.error("❌ 删除视图失败:", e);
        toast.showToast({ type: "error", message: "删除失败" });
      }
    },
    [onDeleteView, sdk, apiClient, tableId, toast, internalViews],
  );

  // 添加字段
  const handleAddField = useCallback(
    async (fieldName: string, fieldType: string, options?: any) => {
      if (onAddField) {
        onAddField(fieldName, fieldType);
        return;
      }

      // 默认 SDK 实现
      try {
        if (!tableId || !(sdk || apiClient)) {
          console.error("❌ 缺少 sdk/apiClient 或 tableId");
          return;
        }
        const adapter = createAdapter(sdk || apiClient);
        await adapter.createField(tableId, {
          name: fieldName,
          type: fieldType,
          options: options || {},
        } as any);
        setShowAddFieldDialog(false);
        gridProps.onDataRefresh?.();
        toast.showToast({ type: "success", message: "字段创建成功" });
      } catch (error) {
        console.error("❌ 字段创建失败:", error);
        toast.showToast({ type: "error", message: "字段创建失败" });
      }
    },
    [onAddField, sdk, apiClient, tableId, gridProps, toast],
  );

  // 关闭添加字段对话框
  const handleCloseAddFieldDialog = useCallback(() => {
    setShowAddFieldDialog(false);
  }, []);

  // 关闭添加记录对话框
  const handleCloseAddRecordDialog = useCallback(() => {
    setShowAddRecordDialog(false);
  }, []);

  // 添加记录成功回调
  const handleAddRecordSuccess = useCallback(() => {
    gridProps.onDataRefresh?.();
    toast.showToast({ type: "success", message: "记录添加成功" });
  }, [gridProps, toast]);

  // 添加记录失败回调
  const handleAddRecordError = useCallback(() => {
    toast.showToast({ type: "error", message: "记录添加失败" });
  }, [toast]);

  // Grid 添加列
  const handleGridAddColumn = useCallback(
    async (
      fieldType: any,
      insertIndex?: number,
      fieldName?: string,
      options?: any,
    ) => {
      if (onAddColumn) {
        onAddColumn(fieldType, insertIndex, fieldName, options);
        return;
      }

      try {
        if (!tableId || !(sdk || apiClient)) return;
        const adapter = createAdapter(sdk || apiClient);
        await adapter.createField(tableId, {
          name: fieldName || `新字段_${Date.now()}`,
          type: fieldType,
          options: options || {},
        } as any);
        gridProps.onDataRefresh?.();
        toast.showToast({ type: "success", message: "字段添加成功" });
      } catch (error) {
        console.error("❌ Grid 字段创建失败:", error);
        toast.showToast({ type: "error", message: "字段添加失败" });
      }
    },
    [onAddColumn, sdk, apiClient, tableId, gridProps, toast],
  );

  // 防抖定时器引用
  const resizeTimeoutRef = useRef<NodeJS.Timeout>();

  // 列宽调整
  const handleColumnResize = useCallback(
    (column: any, newSize: number, colIndex: number) => {
      console.log("🔍 StandardDataView handleColumnResize 被调用:", {
        column: column.name,
        newSize,
        colIndex,
        columnId: column.id,
      });

      // 如果传入了自定义回调，优先使用
      if (gridProps.onColumnResize) {
        gridProps.onColumnResize(column, newSize, colIndex);
        return;
      }

      // 列ID缺失则忽略
      if (!column || typeof column.id !== "string") {
        return;
      }

      // 立即更新本地状态
      setColumnWidths((prev) => ({ ...prev, [column.id as string]: newSize }));

      // 协作：广播列宽变更（增量）
      try {
        sendColumnWidth && sendColumnWidth({ [column.id as string]: newSize });
      } catch {}

      // 清除之前的定时器
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }

      // 防抖：延迟 500ms 后保存到后端
      resizeTimeoutRef.current = setTimeout(async () => {
        try {
          if (!tableId || !(sdk || apiClient)) {
            console.warn("⚠️ 缺少 tableId 或 SDK/API 客户端，无法保存列宽配置");
            return;
          }

          const adapter = createAdapter(sdk || apiClient);

          // 获取当前视图 ID
          const currentViewId = activeViewId || internalActiveViewId;
          if (!currentViewId) {
            console.warn("⚠️ 缺少视图 ID，无法保存列宽配置");
            return;
          }
          const viewId = currentViewId as string;

          // 构建列配置数据 - 转换为数组格式
          const currentColumnMeta = columnMeta || [];
          let updatedColumnMeta = [...currentColumnMeta];

          // 查找并更新指定列的宽度
          const existingColumnIndex = updatedColumnMeta.findIndex(
            (col: any) => col.fieldId === (column.id as string),
          );

          if (existingColumnIndex >= 0) {
            // 更新现有列配置
            updatedColumnMeta[existingColumnIndex] = {
              ...updatedColumnMeta[existingColumnIndex],
              width: newSize,
            };
          } else {
            // 添加新的列配置
            updatedColumnMeta.push({
              fieldId: column.id as string,
              width: newSize,
              visible: true,
              order: colIndex,
            });
          }

          console.log("💾 保存列宽配置:", {
            viewId: currentViewId,
            columnId: column.id,
            newWidth: newSize,
            columnMeta: updatedColumnMeta,
          });

          // 使用 SDK 的便捷方法设置列宽度
          if (sdk) {
            await sdk.views.setColumnWidth(
              viewId,
              column.id as string,
              newSize,
            );
          } else if (apiClient) {
            // 如果只有 apiClient，使用直接的 HTTP 请求
            const response = await fetch(
              `/api/v1/views/${viewId}/column-meta`,
              {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${apiClient.config.accessToken}`,
                },
                body: JSON.stringify({
                  columnMeta: updatedColumnMeta,
                }),
              },
            );

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
          } else {
            throw new Error("No SDK or API client available");
          }

          console.log("✅ 列宽配置保存成功");

          // 更新本地列配置状态
          setColumnMeta(updatedColumnMeta);

          // 成功后可再次广播校对（可选）
          try {
            sendColumnWidth &&
              sendColumnWidth({ [column.id as string]: newSize });
          } catch {}
        } catch (error) {
          console.error("❌ 保存列宽配置失败:", error);
          toast.showToast({
            type: "error",
            message: "保存列宽配置失败",
          });
        }
      }, 500); // 500ms 防抖延迟
    },
    [
      gridProps,
      tableId,
      sdk,
      apiClient,
      activeViewId,
      internalActiveViewId,
      columnMeta,
      toast,
      sendColumnWidth,
    ],
  );

  // 列排序
  const handleColumnOrdered = useCallback(
    (dragColIndexCollection: number[], dropColIndex: number) => {
      if (gridProps.onColumnOrdered) {
        gridProps.onColumnOrdered(dragColIndexCollection, dropColIndex);
        return;
      }
      // 默认实现：本地乐观更新顺序
      setColumnOrder((prev) => {
        const initial =
          prev.length === 0 && Array.isArray(gridProps.columns)
            ? Array.from({ length: gridProps.columns.length }, (_, i) => i)
            : prev;
        const newOrder = [...initial];
        const draggedItems = [...dragColIndexCollection].sort((a, b) => b - a);
        draggedItems.forEach((index) => newOrder.splice(index, 1));
        const adjustedDropIndex =
          draggedItems[0] < dropColIndex
            ? dropColIndex - draggedItems.length
            : dropColIndex;
        newOrder.splice(adjustedDropIndex, 0, ...dragColIndexCollection);

        // 协作：广播列顺序（按字段ID序列）
        try {
          if (
            Array.isArray(gridProps.columns) &&
            gridProps.columns.length > 0
          ) {
            const orderedIds = newOrder
              .map(
                (idx) =>
                  (gridProps.columns as any)[idx]?.id as string | undefined,
              )
              .filter(
                (id): id is string => typeof id === "string" && id.length > 0,
              );
            if (orderedIds.length > 0) {
              sendColumnOrder && sendColumnOrder(orderedIds);
            }
          }
        } catch {}

        // 持久化：更新 columnMeta 的 order 字段
        (async () => {
          try {
            if (!tableId || !(sdk || apiClient)) return;
            const currentViewId = activeViewId || internalActiveViewId;
            if (!currentViewId || !Array.isArray(gridProps.columns)) return;

            const payload = newOrder.map((idx, order) => ({
              fieldId: String(
                (gridProps.columns &&
                  gridProps.columns[idx] &&
                  (gridProps.columns[idx] as any).id) ??
                  "",
              ),
              order,
              // 可携带已有宽度，避免被覆盖
              width:
                columnWidths[
                  String(
                    (gridProps.columns &&
                      gridProps.columns[idx] &&
                      (gridProps.columns[idx] as any).id) ??
                      "",
                  )
                ],
            }));

            if (sdk) {
              await sdk.views.updateColumnMeta(currentViewId, payload);
            } else if (apiClient) {
              await fetch(
                `/api/v1/views/${String(currentViewId)}/column-meta`,
                {
                  method: "PATCH",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${apiClient.config.accessToken}`,
                  },
                  body: JSON.stringify({ columnMeta: payload }),
                },
              );
            }

            setColumnMeta((prevMeta) => {
              const metaById: Record<string, any> = {};
              (prevMeta || []).forEach((m: any) => {
                metaById[m.fieldId] = m;
              });
              payload.forEach((m) => {
                metaById[m.fieldId] = { ...(metaById[m.fieldId] || {}), ...m };
              });
              return Object.values(metaById);
            });

            // 成功后可再次广播校对（可选）
            try {
              const orderedIds = newOrder
                .map(
                  (idx) =>
                    (gridProps.columns as any)[idx]?.id as string | undefined,
                )
                .filter(
                  (id): id is string => typeof id === "string" && id.length > 0,
                );
              if (orderedIds.length > 0) {
                sendColumnOrder && sendColumnOrder(orderedIds);
              }
            } catch {}
          } catch (e) {
            console.warn("⚠️ 列顺序持久化失败:", e);
          }
        })();

        return newOrder;
      });
    },
    [
      gridProps,
      sendColumnOrder,
      tableId,
      sdk,
      apiClient,
      activeViewId,
      internalActiveViewId,
      columnWidths,
    ],
  );

  // 行高变更
  const handleRowHeightChange = useCallback(
    (newRowHeight: RowHeight) => {
      setRowHeightState(newRowHeight);
      onRowHeightChange?.(newRowHeight);
    },
    [onRowHeightChange],
  );

  // ==================== Computed ====================

  const isMobile = deviceType === "mobile";

  // 解析行高像素值
  const resolvedRowHeight = useMemo(() => {
    const heightMap: Record<RowHeight, number> = {
      short: 28,
      medium: 32,
      tall: 40,
      "extra-tall": 56,
    };
    return heightMap[rowHeightState] || 32;
  }, [rowHeightState]);

  // 增强的 Grid Props（应用列宽和列顺序）
  const enhancedGridProps = useMemo<IGridProps>(() => {
    if (!gridProps || !gridProps.columns) return gridProps as IGridProps;

    const finalColumnOrder =
      columnOrder.length === 0
        ? Array.from({ length: gridProps.columns.length }, (_, i) => i)
        : columnOrder;

    const reorderedColumns = finalColumnOrder.map((originalIndex: number) => {
      const column = gridProps.columns![originalIndex] as any;
      const nameSafe: string =
        typeof column.name === "string"
          ? column.name
          : String(column.name ?? "");
      const idSafe: string =
        typeof column.id === "string" ? column.id : String(column.id ?? "");
      return {
        ...column,
        name: nameSafe,
        id: idSafe,
        width:
          columnWidths[idSafe] ?? (column.width as number | undefined) ?? 150,
      } as any;
    }) as any;

    return { ...(gridProps as any), columns: reorderedColumns } as IGridProps;
  }, [gridProps, columnWidths, columnOrder]);

  // ==================== Render ====================

  return (
    <div
      className={cn("flex h-full w-full flex-col", className)}
      style={style}
      role="application"
      aria-label="数据视图"
    >
      {/* Header */}
      {showHeader && (
        <ViewHeader
          tabs={tabs}
          activeTabKey={activeKey}
          onTabChange={setActiveKey}
          views={finalViews}
          activeViewId={finalActiveViewId}
          onViewChange={handleInternalViewChange}
          onCreateView={handleInternalCreateView}
          onRenameView={handleInternalRenameView}
          onDeleteView={handleInternalDeleteView}
          onAdd={onAdd}
          isMobile={isMobile}
          isTouch={isTouch}
          syncHeader={
            props.syncHeader
              ? {
                  tableId: props.syncHeader.tableId,
                  userId: props.syncHeader.userId,
                  token: props.syncHeader.token,
                  endpoint: props.syncHeader.endpoint,
                  debug: props.syncHeader.debug,
                  onColumnOrder: (orderIds: string[]) => {
                    if (!gridProps.columns) return;
                    const idToIndex: Record<string, number> = {};
                    gridProps.columns.forEach((c: any, i: number) => {
                      if (c && c.id) idToIndex[String(c.id)] = i;
                    });
                    const newOrder = orderIds
                      .map((id) => idToIndex[id])
                      .filter((v): v is number => typeof v === "number");
                    if (newOrder.length > 0) setColumnOrder(newOrder);
                  },
                  onColumnWidth: (widths: Record<string, number>) =>
                    setColumnWidths((prev) => ({ ...prev, ...widths })),
                }
              : undefined
          }
        />
      )}

      {/* Toolbar */}
      {showToolbar && activeKey === "table" && (
        <ViewToolbar
          config={toolbarConfig}
          fields={fields}
          fieldConfigMode={fieldConfigMode}
          onFieldToggle={onFieldToggle}
          onFieldReorder={onFieldReorder}
          onFieldEdit={onFieldEdit}
          onFieldDelete={onFieldDelete}
          onFieldGroup={onFieldGroup}
          onFieldCopy={onFieldCopy}
          onFieldInsertLeft={onFieldInsertLeft}
          onFieldInsertRight={onFieldInsertRight}
          onFieldFilter={onFieldFilter}
          onFieldSort={onFieldSort}
          onFieldFreeze={onFieldFreeze}
          rowHeight={rowHeightState}
          onRowHeightChange={handleRowHeightChange}
          filterFields={filterFields}
          filterConditions={filterConditions}
          onFilterConditionsChange={onFilterConditionsChange}
          onFilteredDataChange={onFilteredDataChange}
          onAddRecord={() => setShowAddRecordDialog(true)}
          onUndo={onToolbar?.onUndo}
          onRedo={onToolbar?.onRedo}
          onFilter={onToolbar?.onFilter}
          onSort={onToolbar?.onSort}
          onGroup={onToolbar?.onGroup}
          isMobile={isMobile}
        />
      )}

      {/* Content */}
      {activeKey === "table" ? (
        <ViewContent
          state={state}
          loadingMessage={loadingMessage}
          emptyStateProps={emptyStateProps}
          errorStateProps={errorStateProps}
          gridProps={enhancedGridProps}
          gridRef={gridRef}
          rowHeight={resolvedRowHeight}
          onAddColumn={handleGridAddColumn}
          onEditColumn={onEditColumn}
          onDeleteColumn={onDeleteColumn}
          onColumnResize={handleColumnResize}
          onColumnOrdered={handleColumnOrdered}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center text-sm text-gray-500">
          图表视图将在后续版本中提供
        </div>
      )}

      {/* StatusBar */}
      {showStatus && (
        <ViewStatusBar recordCount={gridProps.rowCount} isMobile={isMobile}>
          {statusContent}
        </ViewStatusBar>
      )}

      {/* Dialogs */}
      {fields && tableId && (
        <>
          <AddFieldDialogV2
            isOpen={showAddFieldDialog}
            onClose={handleCloseAddFieldDialog}
            onConfirm={handleAddField}
          />
          <AddRecordDialog
            isOpen={showAddRecordDialog}
            onClose={handleCloseAddRecordDialog}
            fields={fields}
            tableId={tableId}
            adapter={sdk || apiClient}
            onSuccess={handleAddRecordSuccess}
            onError={handleAddRecordError}
          />
        </>
      )}
    </div>
  );
}

export default StandardDataView;
