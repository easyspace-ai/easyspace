/**
 * 真实数据演示应用
 * 使用 LuckDB SDK 对接真实数据
 */

import { useMemo, useState, useCallback, useEffect } from "react";
import { StandardDataView } from "@luckdb/aitable";
import type { DataViewState, RowHeight } from "@luckdb/aitable";
import { useTableData } from "@luckdb/aitable";
import { createSDKAdapter } from "@luckdb/aitable";

/**
 * 真实数据演示应用
 * 
 * 特性：
 * - 连接真实的 LuckDB 后端
 * - 完整的 CRUD 操作
 * - 实时数据同步
 * - 错误处理和加载状态
 */
function RealDataApp() {
  // 登录状态
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    // 从本地存储恢复登录状态
    const savedToken = localStorage.getItem('luckdb_auth_token');
    return !!savedToken;
  });
  const [authToken, setAuthToken] = useState<string>(() => {
    // 从本地存储恢复令牌
    return localStorage.getItem('luckdb_auth_token') || '';
  });
  
  // 表格配置
  const [tableId, setTableId] = useState<string>(() => {
    // 从本地存储恢复表格ID
    return localStorage.getItem('luckdb_table_id') || '';
  });
  const [isConfigured, setIsConfigured] = useState(() => {
    // 如果有保存的表格ID和令牌，则自动配置
    const savedTableId = localStorage.getItem('luckdb_table_id');
    const savedToken = localStorage.getItem('luckdb_auth_token');
    return !!(savedTableId && savedToken);
  });
  
  // 添加清除配置的状态
  const [showConfig, setShowConfig] = useState(false);
  
  // 登录表单
  const [email, setEmail] = useState('admin@126.com');
  const [password, setPassword] = useState('Pmker123');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // 配置
  const config = {
    baseURL: 'http://localhost:8080',
    token: authToken,
    tableId: tableId,
  };

  // 处理登录
  const handleLogin = useCallback(async () => {
    if (!email || !password) {
      setLoginError('请输入邮箱和密码');
      return;
    }

    setIsLoggingIn(true);
    setLoginError('');

    try {
      // 直接使用 fetch 进行登录，SDK 实例通过 useTableData Hook 获取

      // 调用登录 API
      const response = await fetch(`${config.baseURL}/api/v1/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (!response.ok) {
        throw new Error('登录失败，请检查邮箱和密码');
      }

      const data = await response.json();
      
      // 根据实际的响应结构获取令牌
      const token = data.data?.accessToken || data.accessToken || data.token;

      if (!token) {
        console.error('响应数据:', data);
        throw new Error('登录成功但未获取到令牌');
      }

      setAuthToken(token);
      setIsLoggedIn(true);
      
      // 保存到本地存储
      localStorage.setItem('luckdb_auth_token', token);
      
      // 如果已经有保存的表格ID，直接进入数据视图
      const savedTableId = localStorage.getItem('luckdb_table_id');
      console.log('🔍 检查保存的表格ID:', savedTableId);
      console.log('🔍 当前状态 - isLoggedIn:', isLoggedIn, 'isConfigured:', isConfigured);
      
      if (savedTableId) {
        setTableId(savedTableId);
        setIsConfigured(true);
        console.log('✅ 登录成功，自动使用已保存的表格ID:', savedTableId);
      } else {
        console.log('✅ 登录成功，等待用户输入表格ID');
      }
    } catch (error: any) {
      console.error('❌ 登录失败:', error);
      setLoginError(error.message || '登录失败，请重试');
    } finally {
      setIsLoggingIn(false);
    }
  }, [email, password, config.baseURL]);

  // 处理配置表格ID
  const handleConfigureTable = useCallback(() => {
    if (!tableId) {
      alert('请输入表格 ID');
      return;
    }
    setIsConfigured(true);
    setShowConfig(false);
    
    // 保存到本地存储
    localStorage.setItem('luckdb_table_id', tableId);
    
    console.log('✅ 表格配置成功:', tableId);
  }, [tableId]);

  // 视图状态
  const [views, setViews] = useState<any[]>([]);
  const [activeViewId, setActiveViewId] = useState<string>('');

  // 行高配置状态
  const [rowHeight, setRowHeight] = useState<RowHeight>('medium');

  // 使用表格数据 Hook（仅在已配置时）
  const {
    table,
    fields,
    records,
    totalRecords,
    loading,
    error,
    columns,
    rowCount,
    loadTableData,
    createRecord,
    getCellContent,
    apiClient,
  } = useTableData({
    baseURL: config.baseURL,
    token: config.token,
    tableId: config.tableId,
    autoLoad: isConfigured && !!authToken && !!tableId,
    limit: 100,
  });

  // 将 IField 转换为 FieldConfig 格式
  const fieldConfigs = useMemo(() => {
    return fields.map((field: any, index: any) => ({
      id: field.id,
      name: field.name,
      type: field.type,
      visible: true, // 默认所有字段都可见
      locked: field.isPrimary, // 主键字段锁定
      required: field.isPrimary, // 主键字段必填
      description: field.description,
    }));
  }, [fields]);

  // 字段配置处理函数
  const handleFieldToggle = useCallback((fieldId: string, visible: boolean) => {
    console.log(`字段 ${fieldId} 显示状态切换为: ${visible}`);
    // TODO: 实现字段显示/隐藏的 API 调用
  }, []);

  const handleFieldReorder = useCallback((fromIndex: number, toIndex: number) => {
    console.log(`字段重新排序: 从 ${fromIndex} 到 ${toIndex}`);
    // TODO: 实现字段排序的 API 调用
  }, []);

  // 编辑字段状态
  const [editingField, setEditingField] = useState<{
    id: string;
    name: string;
    type: string;
  } | null>(null);
  const [showEditFieldDialog, setShowEditFieldDialog] = useState(false);
  const [isUpdatingField, setIsUpdatingField] = useState(false);

  const handleFieldEdit = useCallback((fieldId: string) => {
    console.log(`编辑字段: ${fieldId}`);
    
    // 找到要编辑的字段
    const field = fields.find((f: any) => f.id === fieldId);
    if (field) {
      setEditingField({
        id: field.id,
        name: field.name,
        type: field.type,
      });
      setShowEditFieldDialog(true);
    }
  }, [fields]);

  const handleFieldDelete = useCallback((fieldId: string) => {
    console.log(`删除字段: ${fieldId}`);
    // TODO: 实现字段删除的 API 调用
  }, []);

  // 处理删除字段（通过列索引）
  const handleDeleteColumn = useCallback(async (columnIndex: number) => {
    console.log('🚀 handleDeleteColumn 被调用:', { columnIndex, tableId, apiClient: !!apiClient });
    
    if (!tableId || !apiClient) {
      console.error('无法删除字段：缺少表格ID或API客户端', { tableId, hasApiClient: !!apiClient });
      alert('无法删除字段：缺少必要的配置信息');
      return;
    }

    try {
      // 获取要删除的字段信息
      const fieldToDelete = fields[columnIndex];
      if (!fieldToDelete) {
        console.error('无法找到要删除的字段');
        alert('无法找到要删除的字段');
        return;
      }

      console.log('准备删除字段:', fieldToDelete);

      // 调用 API 删除字段
      await apiClient.deleteField(tableId, fieldToDelete.id);

      console.log('✅ 字段删除成功');
      
      // 刷新表格数据以显示删除后的结果
      if (loadTableData) {
        await loadTableData();
        console.log('✅ 表格数据已刷新');
      }
      
      // 显示成功消息
      console.log(`✅ 字段 "${fieldToDelete.name}" 删除成功！`);
      
    } catch (error: any) {
      console.error('❌ 删除字段失败:', error);
      
      // 显示详细的错误消息
      const errorMessage = error?.response?.data?.message || error?.message || '未知错误';
      alert(`删除字段失败: ${errorMessage}`);
    }
  }, [tableId, apiClient, loadTableData, fields]);

  const handleFieldGroup = useCallback((fieldId: string) => {
    console.log(`创建字段编组: ${fieldId}`);
    // TODO: 实现字段编组的 API 调用
  }, []);

  // 新增字段操作处理函数
  const handleFieldCopy = useCallback((fieldId: string) => {
    console.log(`复制字段: ${fieldId}`);
    // TODO: 实现复制字段的 API 调用
  }, []);

  const handleFieldInsertLeft = useCallback((fieldId: string) => {
    console.log(`在左侧插入字段: ${fieldId}`);
    // TODO: 实现插入字段的 API 调用
  }, []);

  const handleFieldInsertRight = useCallback((fieldId: string) => {
    console.log(`在右侧插入字段: ${fieldId}`);
    // TODO: 实现插入字段的 API 调用
  }, []);

  const handleFieldFilter = useCallback((fieldId: string) => {
    console.log(`按字段筛选: ${fieldId}`);
    // TODO: 实现字段筛选的 API 调用
  }, []);

  const handleFieldSort = useCallback((fieldId: string) => {
    console.log(`按字段排序: ${fieldId}`);
    // TODO: 实现字段排序的 API 调用
  }, []);

  const handleFieldFreeze = useCallback((fieldId: string) => {
    console.log(`冻结字段: ${fieldId}`);
    // TODO: 实现字段冻结的 API 调用
  }, []);

  // 字段类型映射函数（前端类型 -> API 类型）
  const mapFieldTypeToAPI = useCallback((dialogFieldType: string): string => {
    const typeMapping: Record<string, string> = {
      // 文本类型
      'text': 'text',  // 根据 API 返回，使用 'text' 而不是 'singleLineText'
      'longText': 'longText',
      
      // 数字类型
      'number': 'number',
      
      // 选择类型
      'singleSelect': 'select',  // 根据 API 返回，使用 'select' 而不是 'singleSelect'
      'multipleSelect': 'multipleSelect',  // API 直接支持 multipleSelect
      
      // 日期时间
      'date': 'date',
      
      // 其他类型
      'checkbox': 'checkbox',
      'attachment': 'attachment',
      'link': 'link',
      'email': 'email',
      'phone': 'phone',
      'location': 'location',
      'rating': 'rating',
      'progress': 'progress',
      'formula': 'formula',
      'user': 'user',
    };
    
    return typeMapping[dialogFieldType] || 'text';
  }, []);

  const handleAddField = useCallback(async (fieldName: string, fieldType: string) => {
    console.log('🔍 handleAddField 被调用:', { fieldName, fieldType, tableId, apiClient: !!apiClient });
    
    if (!tableId || !apiClient) {
      console.error('无法添加字段：缺少表格ID或API客户端', { tableId, hasApiClient: !!apiClient });
      return;
    }

    try {
      console.log(`开始添加新字段: ${fieldName}, 类型: ${fieldType}`);
      
      // 映射字段类型到 API 期望的格式
      const apiFieldType = mapFieldTypeToAPI(fieldType);
      console.log(`字段类型映射: ${fieldType} -> ${apiFieldType}`);
      
      // 调用 API 创建字段
      const newField = await apiClient.createField(tableId, {
        name: fieldName,
        type: apiFieldType as any,
        description: `用户创建的字段: ${fieldName}`,
      });

      console.log('✅ 字段创建成功:', newField);
      
      // 刷新表格数据以显示新字段
      if (loadTableData) {
        await loadTableData();
        console.log('✅ 表格数据已刷新');
      }
      
      // 显示成功消息（可选）
      // 这里可以添加 toast 通知或其他用户反馈
      //alert(`字段 "${fieldName}" 创建成功！`);
      
    } catch (error) {
      console.error('❌ 创建字段失败:', error);
      
      // 显示错误消息（可选）
      // 这里可以添加错误提示
      alert(`创建字段失败: ${error.message || '未知错误'}`);
    }
  }, [tableId, apiClient, loadTableData, mapFieldTypeToAPI]);

  // 新增：处理 AddFieldMenu 的 onConfirm 回调
  const handleAddColumn = useCallback(async (fieldType: string, insertIndex?: number, fieldName?: string, options?: any) => {
    console.log('🚀 handleAddColumn 被调用:', { fieldType, insertIndex, fieldName, options, tableId, apiClient: !!apiClient });
    
    if (!tableId || !apiClient) {
      console.error('无法添加字段：缺少表格ID或API客户端', { tableId, hasApiClient: !!apiClient });
      return;
    }

    try {
      // 如果没有提供字段名，使用默认名称
      const finalFieldName = fieldName || `新字段_${Date.now()}`;
      
      console.log(`开始添加新字段: ${finalFieldName}, 类型: ${fieldType}`);
      
      // 映射字段类型到 API 期望的格式
      const apiFieldType = mapFieldTypeToAPI(fieldType);
      console.log(`字段类型映射: ${fieldType} -> ${apiFieldType}`);
      
      // 准备创建字段的数据
      const createFieldData: any = {
        name: finalFieldName,
        type: apiFieldType as any,
        description: options?.description || `用户创建的字段: ${finalFieldName}`,
      };

      // 如果是选择类型字段，添加选项
      if (fieldType === 'singleSelect' || fieldType === 'multipleSelect') {
        createFieldData.options = {
          choices: options?.options || [],
        };
      }

      // 如果是公式字段，添加公式
      if (fieldType === 'formula' && options?.formula) {
        createFieldData.options = {
          expression: options.formula,
        };
      }

      console.log('准备调用 createField，参数:', createFieldData);
      
      // 调用 API 创建字段
      const newField = await apiClient.createField(tableId, createFieldData);

      console.log('✅ 字段创建成功:', newField);
      
      // 刷新表格数据以显示新字段
      if (loadTableData) {
        await loadTableData();
        console.log('✅ 表格数据已刷新');
      }
      
      // 显示成功消息
     // alert(`字段 "${finalFieldName}" 创建成功！`);
      
    } catch (error) {
      console.error('❌ 创建字段失败:', error);
      
      // 显示错误消息
      alert(`创建字段失败: ${error.message || '未知错误'}`);
    }
  }, [tableId, apiClient, loadTableData, mapFieldTypeToAPI]);

  // 处理字段编辑
  const handleEditColumn = useCallback(async (columnIndex: number, updatedColumn: any) => {
    console.log('🚀 handleEditColumn 被调用:', { columnIndex, updatedColumn, tableId, apiClient: !!apiClient });
    
    if (!tableId || !apiClient) {
      console.error('无法编辑字段：缺少表格ID或API客户端', { tableId, hasApiClient: !!apiClient });
      alert('无法编辑字段：缺少必要的配置信息');
      return;
    }

    try {
      // 获取当前字段信息
      const currentField = fields[columnIndex];
      if (!currentField) {
        console.error('无法找到要编辑的字段');
        alert('无法找到要编辑的字段');
        return;
      }

      console.log('当前字段信息:', currentField);
      console.log('更新后的字段信息:', updatedColumn);

      // 验证字段名称
      if (!updatedColumn.name || updatedColumn.name.trim() === '') {
        alert('字段名称不能为空');
        return;
      }

      // 映射字段类型到 API 期望的格式
      const apiFieldType = mapFieldTypeToAPI(updatedColumn.type);
      console.log(`字段类型映射: ${updatedColumn.type} -> ${apiFieldType}`);

      // 准备更新字段的数据
      const updateFieldData: any = {
        name: updatedColumn.name.trim(),
        type: apiFieldType as any,
        description: updatedColumn.options?.description || `用户编辑的字段: ${updatedColumn.name}`,
      };

      // 根据字段类型处理配置选项
      if (updatedColumn.type === 'singleSelect' || updatedColumn.type === 'multipleSelect') {
        const options = updatedColumn.options?.options || [];
        if (options.length === 0) {
          alert('选择类型字段至少需要一个选项');
          return;
        }
        updateFieldData.options = {
          choices: options.map((opt: any) => ({
            id: opt.id,
            name: opt.label || opt.name,
            color: opt.color,
          })),
          allowOther: updatedColumn.options?.allowOther || false,
        };
      } else if (updatedColumn.type === 'formula') {
        if (!updatedColumn.options?.formula || updatedColumn.options.formula.trim() === '') {
          alert('公式字段不能为空');
          return;
        }
        updateFieldData.options = {
          expression: updatedColumn.options.formula.trim(),
          description: updatedColumn.options.description || '',
        };
      } else if (updatedColumn.type === 'number') {
        updateFieldData.options = {
          format: updatedColumn.options?.format || 'number',
          precision: updatedColumn.options?.precision ?? 0,
          min: updatedColumn.options?.min,
          max: updatedColumn.options?.max,
          prefix: updatedColumn.options?.prefix,
          suffix: updatedColumn.options?.suffix,
        };
      } else if (updatedColumn.type === 'date') {
        updateFieldData.options = {
          includeTime: updatedColumn.options?.includeTime || false,
          dateFormat: updatedColumn.options?.dateFormat || 'YYYY-MM-DD',
          timeFormat: updatedColumn.options?.timeFormat || '24h',
        };
      } else if (updatedColumn.type === 'rating') {
        updateFieldData.options = {
          maxRating: updatedColumn.options?.maxRating ?? 5,
          icon: updatedColumn.options?.icon || 'star',
          color: updatedColumn.options?.color || '#f59e0b',
        };
      }

      console.log('准备调用 updateField，参数:', updateFieldData);
      
      // 设置加载状态
      setIsUpdatingField(true);
      
      // 调用 API 更新字段
      const updatedField = await apiClient.updateField(tableId, currentField.id, updateFieldData);

      console.log('✅ 字段更新成功:', updatedField);
      
      // 刷新表格数据以显示更新后的字段
      if (loadTableData) {
        await loadTableData();
        console.log('✅ 表格数据已刷新');
      }
      
      // 显示成功消息
      console.log(`✅ 字段 "${updatedColumn.name}" 更新成功！`);
      
    } catch (error: any) {
      console.error('❌ 更新字段失败:', error);
      
      // 显示详细的错误消息
      const errorMessage = error?.response?.data?.message || error?.message || '未知错误';
      alert(`更新字段失败: ${errorMessage}`);
    } finally {
      // 清除加载状态
      setIsUpdatingField(false);
    }
  }, [tableId, apiClient, loadTableData, mapFieldTypeToAPI, fields]);

  const handleUpdateField = useCallback(async (fieldName: string, fieldType: string) => {
    if (!tableId || !apiClient || !editingField) {
      console.error('无法更新字段：缺少必要参数');
      return;
    }

    try {
      console.log(`开始更新字段: ${editingField.id}, 新名称: ${fieldName}, 新类型: ${fieldType}`);
      
      // 映射字段类型到 API 期望的格式
      const apiFieldType = mapFieldTypeToAPI(fieldType);
      console.log(`字段类型映射: ${fieldType} -> ${apiFieldType}`);
      
      // 调用 API 更新字段
      const updatedField = await apiClient.updateField(tableId, editingField.id, {
        name: fieldName,
        type: apiFieldType as any,
        description: `用户编辑的字段: ${fieldName}`,
      });

      console.log('✅ 字段更新成功:', updatedField);
      
      // 刷新表格数据以显示更新后的字段
      if (loadTableData) {
        await loadTableData();
        console.log('✅ 表格数据已刷新');
      }
      
      // 关闭编辑对话框
      setShowEditFieldDialog(false);
      setEditingField(null);
      
    } catch (error) {
      console.error('❌ 更新字段失败:', error);
    }
  }, [tableId, apiClient, editingField, mapFieldTypeToAPI, loadTableData]);

  // 行高变更处理函数
  const handleRowHeightChange = useCallback((newRowHeight: RowHeight) => {
    setRowHeight(newRowHeight);
    console.log(`行高变更为: ${newRowHeight}`);
    // TODO: 实现行高的实际应用（可能需要传递给 Grid 组件）
  }, []);

  // 加载视图列表
  const loadViews = useCallback(async () => {
    if (!tableId || !apiClient) return;
    
    try {
      const viewsList = await apiClient.getViews(tableId);
      setViews(viewsList);
      
      // 设置第一个视图为默认激活视图
      if (viewsList.length > 0 && !activeViewId) {
        setActiveViewId(viewsList[0].id);
      }
      
      console.log('✅ 视图列表加载成功:', viewsList);
    } catch (error) {
      console.error('❌ 加载视图列表失败:', error);
    }
  }, [tableId, apiClient, activeViewId]);

  // 视图切换处理
  const handleViewChange = useCallback((viewId: string) => {
    setActiveViewId(viewId);
    console.log('🔄 切换到视图:', viewId);
  }, []);

  // 创建新视图处理
  const handleCreateView = useCallback(async (viewType: string) => {
    if (!tableId || !apiClient) return;
    
    try {
      const newView = await apiClient.createView(tableId, {
        name: `${viewType}视图`,
        type: viewType as any,
      });
      
      // 更新视图列表
      setViews(prev => [...prev, newView]);
      setActiveViewId(newView.id);
      
      console.log('✅ 新视图创建成功:', newView);
    } catch (error) {
      console.error('❌ 创建视图失败:', error);
    }
  }, [tableId, apiClient]);

  // 当表格配置完成时加载视图
  useEffect(() => {
    if (isConfigured && tableId) {
      loadViews();
    }
  }, [isConfigured, tableId, loadViews]);

  // 统计信息
  const statistics = useMemo(() => {
    if (!records.length) return { completed: 0, inProgress: 0, pending: 0, completionRate: 0 };
    
    // 假设有一个状态字段
    const statusField = fields.find((f: any) => f.name === '状态');
    if (!statusField) {
      return { completed: 0, inProgress: 0, pending: 0, completionRate: 0 };
    }

    const statusCounts = records.reduce((acc: any, record: any) => {
      const status = record.fields['状态'] || 'pending';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const completed = statusCounts['已完成'] || 0;
    const inProgress = statusCounts['进行中'] || 0;
    const pending = statusCounts['待处理'] || 0;
    const completionRate = records.length > 0 ? Math.round((completed / records.length) * 100) : 0;

    return { completed, inProgress, pending, completionRate };
  }, [records, fields]);

  // 处理错误状态
  const currentViewState: DataViewState = useMemo(() => {
    if (!isConfigured) return 'idle';
    if (loading) return 'loading';
    if (error) return 'error';
    if (!records.length) return 'empty';
    return 'idle';
  }, [isConfigured, loading, error, records.length]);

  // 处理添加记录
  const handleAddRecord = useCallback(async () => {
    try {
      const newRecord = await createRecord({
        '任务标题': '新任务',
        '状态': '待处理',
        '优先级': '中',
        '负责人': '当前用户',
      });
      console.log('✅ 记录添加成功:', newRecord);
    } catch (error) {
      console.error('❌ 添加记录失败:', error);
    }
  }, [createRecord]);

  // 处理重新加载
  const handleReload = useCallback(async () => {
    try {
      await loadTableData();
    } catch (error) {
      console.error('❌ 重新加载失败:', error);
    }
  }, [loadTableData]);

  // 如果未登录，显示登录表单
  if (!isLoggedIn) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ backgroundColor: '#f9fafb' }}>
        <div 
          style={{ 
            width: '400px',
            padding: '32px',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          }}
        >
          <h2 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '8px', color: '#1f2937' }}>
            登录 LuckDB
          </h2>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>
            使用您的账号连接到 LuckDB 服务器
          </p>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>
              邮箱地址
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@126.com"
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '14px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                outline: 'none',
                transition: 'border-color 150ms',
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '14px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                outline: 'none',
                transition: 'border-color 150ms',
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
          </div>

          {loginError && (
            <div 
              style={{ 
                padding: '12px',
                marginBottom: '16px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                fontSize: '13px',
                color: '#dc2626',
              }}
            >
              {loginError}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={isLoggingIn}
            style={{
              width: '100%',
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: 500,
              color: 'white',
              backgroundColor: isLoggingIn ? '#9ca3af' : '#3b82f6',
              border: 'none',
              borderRadius: '6px',
              cursor: isLoggingIn ? 'not-allowed' : 'pointer',
              transition: 'background-color 150ms',
            }}
            onMouseEnter={(e) => {
              if (!isLoggingIn) e.currentTarget.style.backgroundColor = '#2563eb';
            }}
            onMouseLeave={(e) => {
              if (!isLoggingIn) e.currentTarget.style.backgroundColor = '#3b82f6';
            }}
          >
            {isLoggingIn ? '登录中...' : '登录'}
          </button>

          <div 
            style={{ 
              marginTop: '20px',
              padding: '12px',
              backgroundColor: '#f0f9ff',
              border: '1px solid #bfdbfe',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#1e40af',
            }}
          >
            <strong>服务器地址：</strong> {config.baseURL}<br />
            <strong>默认账号：</strong> admin@126.com<br />
            <strong>默认密码：</strong> Pmker123
          </div>
        </div>
      </div>
    );
  }

  // 如果已登录但未配置表格或需要重新配置，显示表格选择界面
  if (!isConfigured || showConfig) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ backgroundColor: '#f9fafb' }}>
        <div 
          style={{ 
            width: '500px',
            padding: '32px',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#1f2937', flex: 1 }}>
              配置数据连接
            </h2>
            <div style={{ display: 'flex', gap: '8px' }}>
              {isLoggedIn && (
                <button
                  onClick={() => setShowConfig(false)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '13px',
                    color: '#6b7280',
                    backgroundColor: 'transparent',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    transition: 'all 150ms',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  取消
                </button>
              )}
              <button
                onClick={() => {
                  setIsLoggedIn(false);
                  setAuthToken('');
                  setIsConfigured(false);
                  setTableId('');
                  setShowConfig(false);
                  localStorage.removeItem('luckdb_auth_token');
                  localStorage.removeItem('luckdb_table_id');
                }}
                style={{
                  padding: '6px 12px',
                  fontSize: '13px',
                  color: '#ef4444',
                  backgroundColor: 'transparent',
                  border: '1px solid #ef4444',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 150ms',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#fef2f2';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                清除配置
              </button>
            </div>
          </div>
          <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>
            输入要查看的表格 ID
            {tableId && (
              <span style={{ fontSize: '12px', color: '#22c55e', marginLeft: '8px' }}>
                💾 已保存: {tableId}
              </span>
            )}
          </p>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>
              表格 ID
            </label>
            <input
              type="text"
              value={tableId}
              onChange={(e) => setTableId(e.target.value)}
              placeholder="例如：tblXXXXXXXXXXXXXX"
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '14px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                outline: 'none',
                fontFamily: 'monospace',
                transition: 'border-color 150ms',
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
              onKeyDown={(e) => e.key === 'Enter' && handleConfigureTable()}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleConfigureTable}
              disabled={!tableId}
              style={{
                flex: 1,
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: 500,
                color: 'white',
                backgroundColor: tableId ? '#3b82f6' : '#9ca3af',
                border: 'none',
                borderRadius: '6px',
                cursor: tableId ? 'pointer' : 'not-allowed',
                transition: 'background-color 150ms',
              }}
              onMouseEnter={(e) => {
                if (tableId) e.currentTarget.style.backgroundColor = '#2563eb';
              }}
              onMouseLeave={(e) => {
                if (tableId) e.currentTarget.style.backgroundColor = '#3b82f6';
              }}
            >
              连接表格
            </button>
            
            {tableId && (
              <button
                onClick={() => {
                  setIsConfigured(true);
                  setShowConfig(false);
                  console.log('✅ 使用已保存的表格ID:', tableId);
                }}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#22c55e',
                  backgroundColor: 'transparent',
                  border: '1px solid #22c55e',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 150ms',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f0fdf4';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                使用已保存
              </button>
            )}
          </div>

          <div 
            style={{ 
              marginTop: '20px',
              padding: '12px',
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#92400e',
            }}
          >
            <strong>💡 如何获取表格 ID：</strong><br />
            1. 打开 LuckDB 应用<br />
            2. 选择要查看的表格<br />
            3. 从 URL 或表格设置中复制表格 ID<br />
            4. 表格 ID 通常以 "tbl" 开头
          </div>
        </div>
      </div>
    );
  }

  // 已配置，显示数据视图
  return (
    <div className="h-screen flex flex-col">
      {/* 配置信息栏 */}
      <div 
        style={{ 
          padding: '12px 16px',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f0fdf4',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
          真实数据模式：
        </span>
        <span style={{ fontSize: '13px', color: '#3b82f6' }}>
          {config.baseURL}
        </span>
        <span style={{ fontSize: '13px', color: '#22c55e' }}>
          ✅ 已认证
        </span>
        <span style={{ fontSize: '13px', color: '#22c55e' }}>
          ✅ 表格: {tableId}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowConfig(true)}
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              color: '#6b7280',
              backgroundColor: 'transparent',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 150ms',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            重新配置
          </button>
          <button
            onClick={() => {
              setIsLoggedIn(false);
              setAuthToken('');
              setIsConfigured(false);
              setTableId('');
              setShowConfig(false);
              localStorage.removeItem('luckdb_auth_token');
              localStorage.removeItem('luckdb_table_id');
            }}
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              color: '#ef4444',
              backgroundColor: 'transparent',
              border: '1px solid #ef4444',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'all 150ms',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#fef2f2';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            清除配置
          </button>
        </div>
      </div>


      {/* 主视图 */}
      <div className="flex-1" style={{ minHeight: 0 }}>
        <StandardDataView
          state={currentViewState}
          loadingMessage="正在加载表格数据..."
          emptyStateProps={{
            title: table ? `${table.name} 暂无数据` : "表格暂无数据",
            description: "开始添加第一条记录，或者检查表格配置",
            actionLabel: "添加记录",
            onAction: handleAddRecord,
          }}
          errorStateProps={{
            title: "数据加载失败",
            message: error || "无法连接到 LuckDB 服务器，请检查网络连接",
            actionLabel: "重新加载",
            onAction: handleReload,
            secondaryActionLabel: "更换表格",
            onSecondaryAction: () => setIsConfigured(false),
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
          // 视图管理属性
          views={views}
          activeViewId={activeViewId}
          onViewChange={handleViewChange}
          onCreateView={handleCreateView}
          apiClient={apiClient}
          // 字段配置属性
          fields={fieldConfigs}
          onFieldToggle={handleFieldToggle}
          onFieldReorder={handleFieldReorder}
          onFieldEdit={handleFieldEdit}
          onFieldDelete={handleFieldDelete}
          onFieldGroup={handleFieldGroup}
          onFieldCopy={handleFieldCopy}
          onFieldInsertLeft={handleFieldInsertLeft}
          onFieldInsertRight={handleFieldInsertRight}
          onFieldFilter={handleFieldFilter}
          // 字段编辑属性
          onEditColumn={handleEditColumn}
          onDeleteColumn={handleDeleteColumn}
          onFieldSort={handleFieldSort}
          onFieldFreeze={handleFieldFreeze}
          onAddField={handleAddField}
          onAddColumn={handleAddColumn}
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
          onAdd={handleAddRecord}
        />
      </div>

      {/* 调试信息 */}
      {process.env.NODE_ENV === 'development' && (
        <div 
          style={{ 
            padding: '8px 16px',
            borderTop: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb',
            fontSize: '11px',
            color: '#64748b',
            display: 'flex',
            gap: '16px',
          }}
        >
          <span>表格: {table?.name || '未知'}</span>
          <span>字段: {fields.length}</span>
          <span>记录: {records.length}/{totalRecords}</span>
          <span>状态: {currentViewState}</span>
          {error && <span style={{ color: '#ef4444' }}>错误: {error}</span>}
        </div>
      )}
    </div>
  );
}

export default RealDataApp;
