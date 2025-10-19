/**
 * AddRecordDialog 测试页面
 * 用于验证"添加记录"功能是否正常工作
 */

import React, { useState } from 'react';
import { AddRecordDialog } from '@luckdb/aitable';
import type { FieldConfig } from '@luckdb/aitable';

// 测试字段配置
const testFields: FieldConfig[] = [
  {
    id: '1',
    name: '姓名',
    type: 'text',
    required: true,
    isPrimary: true,
    description: '请输入姓名',
  },
  {
    id: '2',
    name: '年龄',
    type: 'number',
    required: false,
    options: {
      min: 0,
      max: 120,
    },
  },
  {
    id: '3',
    name: '邮箱',
    type: 'email',
    required: true,
    description: '请输入有效的邮箱地址',
  },
  {
    id: '4',
    name: '生日',
    type: 'date',
    required: false,
  },
  {
    id: '5',
    name: '激活状态',
    type: 'checkbox',
    required: false,
  },
  {
    id: '6',
    name: '评分',
    type: 'rating',
    required: false,
    options: {
      max: 5,
    },
  },
  {
    id: '7',
    name: '个人网站',
    type: 'link',
    required: false,
    description: '请输入个人网站链接',
  },
];

// 模拟 SDK
const mockSDK = {
  createRecord: async (tableId: string, data: any) => {
    console.log('📝 Mock SDK createRecord called:', { tableId, data });
    
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      id: `rec_${Date.now()}`,
      fields: data.fields,
      createdTime: new Date().toISOString(),
    };
  },
};

export function AddRecordTest() {
  const [isOpen, setIsOpen] = useState(false);
  const [records, setRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSuccess = (record: any) => {
    console.log('✅ Record created successfully:', record);
    setRecords(prev => [record, ...prev]);
    setIsOpen(false);
  };

  const handleError = (error: Error) => {
    console.error('❌ Record creation failed:', error);
    alert(`保存失败: ${error.message}`);
  };

  return (
    <div style={{ 
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          marginBottom: '8px',
          color: '#1a202c',
        }}>
          AddRecordDialog 功能测试
        </h1>
        
        <p style={{
          fontSize: '14px',
          color: '#718096',
          marginBottom: '24px',
        }}>
          测试内置"添加记录"弹窗的各项功能
        </p>

        {/* 测试按钮 */}
        <div style={{ marginBottom: '24px' }}>
          <button
            onClick={() => setIsOpen(true)}
            disabled={isLoading}
            style={{
              padding: '12px 24px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.7 : 1,
              transition: 'all 0.2s',
            }}
          >
            {isLoading ? '测试中...' : '🧪 测试添加记录'}
          </button>
        </div>

        {/* 功能说明 */}
        <div style={{
          padding: '16px',
          backgroundColor: '#f7fafc',
          borderRadius: '8px',
          marginBottom: '24px',
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            marginBottom: '8px',
            color: '#2d3748',
          }}>
            🎯 测试功能
          </h3>
          <ul style={{
            fontSize: '14px',
            color: '#4a5568',
            margin: 0,
            paddingLeft: '20px',
          }}>
            <li>✅ Portal 居中显示</li>
            <li>✅ ESC 关闭、Enter 提交</li>
            <li>✅ 自动焦点管理</li>
            <li>✅ 表单自动渲染（7 种字段类型）</li>
            <li>✅ 实时校验（必填、格式）</li>
            <li>✅ Loading 状态</li>
            <li>✅ 保存成功后刷新</li>
          </ul>
        </div>

        {/* 已创建的记录 */}
        <div>
          <h2 style={{
            fontSize: '18px',
            fontWeight: '600',
            marginBottom: '16px',
            color: '#2d3748',
          }}>
            已创建的记录 ({records.length})
          </h2>
          
          {records.length === 0 ? (
            <div style={{
              padding: '32px',
              textAlign: 'center',
              backgroundColor: '#f7fafc',
              borderRadius: '8px',
              color: '#718096',
            }}>
              <p>暂无记录，点击上方按钮测试添加</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {records.map((record, index) => (
                <div 
                  key={record.id} 
                  style={{
                    padding: '16px',
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                  }}>
                    <span style={{
                      fontWeight: '600',
                      color: '#2d3748',
                    }}>
                      记录 #{index + 1}
                    </span>
                    <span style={{
                      fontSize: '12px',
                      color: '#718096',
                    }}>
                      {new Date(record.createdTime).toLocaleString()}
                    </span>
                  </div>
                  
                  <div style={{
                    fontSize: '14px',
                    color: '#4a5568',
                  }}>
                    <pre style={{
                      margin: 0,
                      padding: '8px',
                      backgroundColor: '#f7fafc',
                      borderRadius: '4px',
                      fontSize: '12px',
                      overflow: 'auto',
                    }}>
                      {JSON.stringify(record.fields, null, 2)}
                    </pre>
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
        fields={testFields}
        tableId="test-table-001"
        adapter={mockSDK}
        onSuccess={handleSuccess}
        onError={handleError}
      />
    </div>
  );
}

export default AddRecordTest;
