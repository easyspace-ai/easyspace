/**
 * AddRecordDialog 基础示例
 */

import React, { useState } from 'react';
import { AddRecordDialog } from '../../src/components/add-record';
import type { FieldConfig } from '../../src/components/add-record';

// 模拟 SDK/ApiClient
const mockAdapter = {
  createRecord: async (tableId: string, data: any) => {
    console.log('创建记录:', { tableId, data });
    
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 返回创建的记录
    return {
      id: `rec_${Date.now()}`,
      fields: data.fields,
      createdTime: new Date().toISOString(),
    };
  },
};

// 字段定义
const fields: FieldConfig[] = [
  {
    id: 'name',
    name: '姓名',
    type: 'text',
    required: true,
    isPrimary: true,
    description: '请输入姓名',
  },
  {
    id: 'age',
    name: '年龄',
    type: 'number',
    required: false,
    options: {
      min: 0,
      max: 120,
    },
  },
  {
    id: 'email',
    name: '邮箱',
    type: 'email',
    required: true,
    description: '请输入有效的邮箱地址',
  },
  {
    id: 'birthday',
    name: '生日',
    type: 'date',
    required: false,
  },
  {
    id: 'active',
    name: '激活状态',
    type: 'checkbox',
    required: false,
  },
];

export function AddRecordBasicExample() {
  const [isOpen, setIsOpen] = useState(false);
  const [records, setRecords] = useState<any[]>([]);

  const handleSuccess = (record: any) => {
    console.log('✅ 记录创建成功:', record);
    setRecords((prev) => [record, ...prev]);
  };

  const handleError = (error: Error) => {
    console.error('❌ 记录创建失败:', error);
    alert(`保存失败: ${error.message}`);
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">AddRecordDialog 基础示例</h1>
        <p className="text-gray-600 mb-8">
          演示如何使用 AddRecordDialog 组件创建记录
        </p>

        {/* 操作按钮 */}
        <div className="mb-8">
          <button
            onClick={() => setIsOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            添加记录
          </button>
        </div>

        {/* 记录列表 */}
        <div className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">
            已创建的记录 ({records.length})
          </h2>
          {records.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              暂无记录，点击上方按钮添加
            </p>
          ) : (
            <div className="space-y-4">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="p-4 bg-gray-50 rounded-md"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-lg">
                      {record.fields.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(record.createdTime).toLocaleString()}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {record.fields.age && (
                      <div>
                        <span className="text-gray-600">年龄：</span>
                        <span>{record.fields.age}</span>
                      </div>
                    )}
                    {record.fields.email && (
                      <div>
                        <span className="text-gray-600">邮箱：</span>
                        <span>{record.fields.email}</span>
                      </div>
                    )}
                    {record.fields.birthday && (
                      <div>
                        <span className="text-gray-600">生日：</span>
                        <span>{record.fields.birthday}</span>
                      </div>
                    )}
                    {record.fields.active !== undefined && (
                      <div>
                        <span className="text-gray-600">激活：</span>
                        <span>{record.fields.active ? '是' : '否'}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AddRecordDialog */}
      <AddRecordDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        fields={fields}
        tableId="table-example-001"
        adapter={mockAdapter}
        onSuccess={handleSuccess}
        onError={handleError}
      />
    </div>
  );
}

export default AddRecordBasicExample;

