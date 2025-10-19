import { useMemo, useState, useCallback } from "react";
import { StandardDataView } from "@luckdb/aitable";
import type { DataViewState, FieldConfig, RowHeight } from "@luckdb/aitable";
import { createDemoColumns, getDemoCellContent, getDemoStatistics } from "./demoData";
import RealDataApp from "./RealDataApp";

// 根据列信息推断字段类型
function getFieldTypeFromColumn(column: any): string {
  const id = column.id.toLowerCase();
  const name = column.name.toLowerCase();
  
  if (id === 'id' || name.includes('id')) return 'text';
  if (id === 'status' || name.includes('状态')) return 'singleSelect';
  if (id === 'priority' || name.includes('优先级')) return 'singleSelect';
  if (id === 'progress' || name.includes('进度')) return 'number';
  if (id === 'estimate' || id === 'actual' || name.includes('工时')) return 'number';
  if (id === 'startdate' || id === 'enddate' || name.includes('日期')) return 'date';
  if (id === 'tags' || name.includes('标签')) return 'multipleSelect';
  if (id === 'description' || name.includes('描述')) return 'longText';
  if (id === 'email' || name.includes('邮箱')) return 'email';
  if (id === 'url' || name.includes('链接')) return 'link';
  if (id === 'assignee' || name.includes('负责人')) return 'user';
  if (id === 'department' || name.includes('部门')) return 'singleSelect';
  
  return 'text'; // 默认为文本类型
}

/**
 * 标准视图演示应用
 * 
 * 特性：
 * - 演示数据模式：15个字段，250行数据
 * - 真实数据模式：连接 LuckDB 后端
 * - 完整的交互细节和状态展示
 */
function App() {
  const [dataMode, setDataMode] = useState<'demo' | 'real'>('real');
  const [rowCount] = useState(250);
  const [viewState, setViewState] = useState<DataViewState>('idle');
  
  // 行高配置状态
  const [rowHeight, setRowHeight] = useState<RowHeight>('medium');

  // 列定义
  const columns = useMemo(() => createDemoColumns(), []);
  
  // 字段配置 - 将列转换为字段配置格式
  const fieldConfigs = useMemo(() => {
    return columns.map((column, index) => ({
      id: column.id,
      name: column.name,
      type: getFieldTypeFromColumn(column),
      visible: true, // 默认所有字段都可见
      locked: column.isPrimary || false, // 主键字段锁定
      required: column.isPrimary || false, // 主键字段必填
      description: `字段 ${index + 1}`,
    }));
  }, [columns]);

  // 单元格内容获取器
  const getCellContent = useCallback(
    (cell: [number, number]) => getDemoCellContent(cell, columns),
    [columns]
  );
  
  // 统计信息
  const statistics = useMemo(() => getDemoStatistics(rowCount), [rowCount]);

  // 字段配置处理函数
  const handleFieldToggle = useCallback((fieldId: string, visible: boolean) => {
    console.log(`演示数据 - 字段 ${fieldId} 显示状态切换为: ${visible}`);
    // TODO: 实现字段显示/隐藏的逻辑
  }, []);

  const handleFieldReorder = useCallback((fromIndex: number, toIndex: number) => {
    console.log(`演示数据 - 字段重新排序: 从 ${fromIndex} 到 ${toIndex}`);
    // TODO: 实现字段排序的逻辑
  }, []);

  const handleFieldEdit = useCallback((fieldId: string) => {
    console.log(`演示数据 - 编辑字段: ${fieldId}`);
    // TODO: 实现字段编辑的逻辑
  }, []);

  const handleFieldDelete = useCallback((fieldId: string) => {
    console.log(`演示数据 - 删除字段: ${fieldId}`);
    // TODO: 实现字段删除的逻辑
  }, []);

  const handleFieldGroup = useCallback((fieldId: string) => {
    console.log(`演示数据 - 创建字段编组: ${fieldId}`);
    // TODO: 实现字段编组的逻辑
  }, []);

  const handleAddField = useCallback((fieldName: string, fieldType: string) => {
    console.log(`演示数据 - 添加新字段: ${fieldName}, 类型: ${fieldType}`);
    // TODO: 实现添加字段的逻辑
  }, []);

  const handleUpdateField = useCallback((fieldId: string, updates: any) => {
    console.log(`演示数据 - 更新字段: ${fieldId}`, updates);
    // TODO: 实现更新字段的逻辑
  }, []);

  // 行高变更处理函数
  const handleRowHeightChange = useCallback((newRowHeight: RowHeight) => {
    setRowHeight(newRowHeight);
    console.log(`演示数据 - 行高变更为: ${newRowHeight}`);
  }, []);

  // 如果是真实数据模式，直接渲染 RealDataApp
  if (dataMode === 'real') {
    return <RealDataApp />;
  }

  return (
    <div className="h-screen flex flex-col">
      {/* 数据模式切换器 */}
      <div 
        style={{ 
          padding: '12px 16px',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
          数据模式：
        </span>
        {(['demo', 'real'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => setDataMode(mode)}
            style={{
              padding: '6px 12px',
              fontSize: '13px',
              borderRadius: '6px',
              border: dataMode === mode ? '1px solid #3b82f6' : '1px solid #d1d5db',
              backgroundColor: dataMode === mode ? '#eff6ff' : 'white',
              color: dataMode === mode ? '#2563eb' : '#64748b',
              cursor: 'pointer',
              fontWeight: dataMode === mode ? 500 : 400,
              transition: 'all 150ms',
            }}
            onMouseEnter={(e) => {
              if (dataMode !== mode) {
                e.currentTarget.style.borderColor = '#9ca3af';
                e.currentTarget.style.color = '#374151';
              }
            }}
            onMouseLeave={(e) => {
              if (dataMode !== mode) {
                e.currentTarget.style.borderColor = '#d1d5db';
                e.currentTarget.style.color = '#64748b';
              }
            }}
          >
            {{
              demo: '演示数据',
              real: '真实数据',
            }[mode]}
          </button>
        ))}

        {/* 演示状态切换器 */}
        {dataMode === 'demo' && (
          <>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500, marginLeft: '16px' }}>
              演示状态：
            </span>
            {(['idle', 'loading', 'empty', 'error'] as const).map((state) => (
              <button
                key={state}
                onClick={() => setViewState(state)}
                style={{
                  padding: '6px 12px',
                  fontSize: '13px',
                  borderRadius: '6px',
                  border: viewState === state ? '1px solid #3b82f6' : '1px solid #d1d5db',
                  backgroundColor: viewState === state ? '#eff6ff' : 'white',
                  color: viewState === state ? '#2563eb' : '#64748b',
                  cursor: 'pointer',
                  fontWeight: viewState === state ? 500 : 400,
                  transition: 'all 150ms',
                }}
                onMouseEnter={(e) => {
                  if (viewState !== state) {
                    e.currentTarget.style.borderColor = '#9ca3af';
                    e.currentTarget.style.color = '#374151';
                  }
                }}
                onMouseLeave={(e) => {
                  if (viewState !== state) {
                    e.currentTarget.style.borderColor = '#d1d5db';
                    e.currentTarget.style.color = '#64748b';
                  }
                }}
              >
                {{
                  idle: '正常',
                  loading: '加载中',
                  empty: '空状态',
                  error: '错误',
                }[state]}
              </button>
            ))}
          </>
        )}

        <div style={{ marginLeft: 'auto', fontSize: '12px', color: '#94a3b8' }}>
          💡 {dataMode === 'demo' ? '演示数据：切换状态查看不同的UI效果' : '真实数据：需要配置 LuckDB 服务器'}
        </div>
      </div>

      {/* 主视图 */}
      <div className="flex-1" style={{ minHeight: 0 }}>
        <StandardDataView
          state={viewState}
          loadingMessage="正在加载项目数据..."
          emptyStateProps={{
            title: "还没有项目",
            description: "创建第一个项目，开始管理你的任务和团队协作",
            actionLabel: "创建项目",
            onAction: () => {
              console.log("创建项目");
              setViewState('idle');
            },
          }}
          errorStateProps={{
            title: "加载失败",
            message: "无法连接到服务器，请检查网络连接后重试",
            actionLabel: "重新加载",
            onAction: () => {
              console.log("重新加载");
              setViewState('loading');
              setTimeout(() => setViewState('idle'), 2000);
            },
            secondaryActionLabel: "联系支持",
            onSecondaryAction: () => {
              console.log("联系支持");
            },
          }}
          showHeader
          showToolbar
          showStatus
          toolbarConfig={{
            showShare: true,
            showAPI: true,
            showSearch: true,
            showFilter: true,
            showSort: true,
            showFieldConfig: true, // 启用字段配置按钮
            showRowHeight: true, // 启用行高配置按钮
          }}
          // 字段配置属性
          fields={fieldConfigs}
          onFieldToggle={handleFieldToggle}
          onFieldReorder={handleFieldReorder}
          onFieldEdit={handleFieldEdit}
          onFieldDelete={handleFieldDelete}
          onFieldGroup={handleFieldGroup}
          onAddField={handleAddField}
          onUpdateField={handleUpdateField}
          // 行高配置属性
          rowHeight={rowHeight}
          onRowHeightChange={handleRowHeightChange}
          gridProps={{ 
            columns, 
            rowCount, 
            getCellContent 
          }}
          statusContent={
            <span style={{ fontSize: '13px' }}>
              已完成 {statistics.completed} | 
              进行中 {statistics.inProgress} | 
              待处理 {statistics.pending} | 
              完成率 {statistics.completionRate}%
            </span>
          }
          onAdd={() => {
            console.log("点击添加按钮");
          }}
        />
      </div>
    </div>
  );
}

export default App;
