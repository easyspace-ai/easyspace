/**
 * ViewHeader - 视图头部组件
 * 
 * 设计原则：
 * 1. 统一的视图头部布局
 * 2. 支持多种视图类型
 * 3. 可配置的工具栏
 * 4. 响应式设计
 */

import React from 'react';
import { cn, tokens } from '../../grid/design-system';

export type ViewType = 'grid' | 'kanban' | 'calendar' | 'gallery' | 'form';

export interface ViewHeaderProps {
  // 基础配置
  title: string;
  viewType: ViewType;
  
  // 工具栏配置
  showToolbar?: boolean;
  toolbarItems?: React.ReactNode[];
  
  // 样式
  className?: string;
  
  // 事件
  onViewTypeChange?: (viewType: ViewType) => void;
  onTitleChange?: (title: string) => void;
}

export function ViewHeader({
  title,
  viewType,
  showToolbar = true,
  toolbarItems = [],
  className,
  onViewTypeChange,
  onTitleChange,
}: ViewHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between',
        'px-4 py-3 border-b',
        'bg-white',
        className
      )}
      style={{
        borderColor: tokens.colors.border.subtle,
      }}
    >
      {/* 左侧：标题和视图类型 */}
      <div className="flex items-center gap-3">
        <h1
          className="text-lg font-semibold"
          style={{ color: tokens.colors.text.primary }}
        >
          {title}
        </h1>
        <span
          className="px-2 py-1 text-xs rounded-md"
          style={{
            backgroundColor: tokens.colors.primary[50],
            color: tokens.colors.primary[700],
          }}
        >
          {viewType}
        </span>
      </div>

      {/* 右侧：工具栏 */}
      {showToolbar && (
        <div className="flex items-center gap-2">
          {toolbarItems}
        </div>
      )}
    </div>
  );
}

export interface CreateViewMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateView: (viewType: ViewType) => void;
}

export function CreateViewMenu({
  isOpen,
  onClose,
  onCreateView,
}: CreateViewMenuProps) {
  if (!isOpen) return null;

  const viewTypes: { type: ViewType; label: string; description: string }[] = [
    { type: 'grid', label: '表格视图', description: '以表格形式显示数据' },
    { type: 'kanban', label: '看板视图', description: '以看板形式管理任务' },
    { type: 'calendar', label: '日历视图', description: '以日历形式显示时间数据' },
    { type: 'gallery', label: '画廊视图', description: '以卡片形式展示数据' },
    { type: 'form', label: '表单视图', description: '以表单形式编辑数据' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl p-6 w-96"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-4">创建新视图</h2>
        <div className="space-y-2">
          {viewTypes.map((view) => (
            <button
              key={view.type}
              onClick={() => {
                onCreateView(view.type);
                onClose();
              }}
              className="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="font-medium">{view.label}</div>
              <div className="text-sm text-gray-500">{view.description}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
