/**
 * 记录客户端（完全匹配EasyDB API v1）
 * 处理记录的 CRUD 操作、查询、批量操作等功能
 */

import { HttpClient } from '../core/http-client';
import type { ShareDBClient } from '../core/sharedb-client.js';
import type { DocumentManager } from '../core/document-manager.js';
import type {
  Record,
  CreateRecordRequest,
  UpdateRecordRequest,
  BulkCreateRecordRequest,
  BulkUpdateRecordRequest,
  BulkDeleteRecordRequest,
  RecordQuery,
  FilterExpression,
  SortExpression,
  PaginatedResponse,
  PaginationParams,
  JsonObject,
  FilterOperator,
} from '../types/index.js';

export class RecordClient {
  private httpClient: HttpClient;
  private sharedbClient?: ShareDBClient;
  private documentManager?: DocumentManager;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  /**
   * 设置 ShareDB 客户端和文档管理器
   */
  public setShareDBClient(sharedbClient: ShareDBClient, documentManager: DocumentManager): void {
    this.sharedbClient = sharedbClient;
    this.documentManager = documentManager;
  }

  // ==================== 基础 CRUD 操作 ====================

  /**
   * 创建记录（POST /api/v1/tables/:tableId/records）
   * ⚠️ 临时方案：后端需要在请求体中传递 tableId
   */
  public async create(recordData: CreateRecordRequest): Promise<Record> {
    const { tableId, ...rest } = recordData; // ✅ 使用 camelCase
    // ⚠️ 临时方案：在请求体中包含 tableId（后端修复后应该从 URL 提取）
    return this.httpClient.post<Record>(`/api/v1/tables/${tableId}/records`, {
      tableId, // ⚠️ 后端修复后应该从 URL 提取
      ...rest,
    });
  }

  /**
   * 获取记录列表（GET /api/v1/tables/:tableId/records）
   * 后端返回格式：{ list: Record[], pagination?: {...} }
   */
  public async list(
    params?: PaginationParams & {
      tableId?: string; // ✅ 使用 camelCase
      filter?: FilterExpression;
      sort?: SortExpression[];
    }
  ): Promise<PaginatedResponse<Record>> {
    if (params?.tableId) {
      const { tableId, ...restParams } = params;
      // Records API 返回 { list: [...] } 格式
      const response = await this.httpClient.get<{ list: Record[]; pagination?: any }>(
        `/api/v1/tables/${tableId}/records`,
        restParams
      );

      // 提取 list 数组
      const records = response?.list || [];

      // 如果有 pagination 信息，使用它；否则手动构造
      if (response?.pagination) {
        return {
          data: records,
          total: response.pagination.total || records.length,
          limit: response.pagination.limit || records.length,
          offset:
            ((response.pagination.page || 1) - 1) * (response.pagination.limit || records.length),
        };
      }

      // 没有 pagination 信息，手动包装
      return {
        data: records,
        total: records.length,
        limit: records.length,
        offset: 0,
      };
    }
    // 全局记录列表（如果存在）
    const response = await this.httpClient.get<{ list: Record[]; pagination?: any }>(
      '/api/v1/records',
      params
    );
    const records = response?.list || [];

    if (response?.pagination) {
      return {
        data: records,
        total: response.pagination.total || records.length,
        limit: response.pagination.limit || records.length,
        offset:
          ((response.pagination.page || 1) - 1) * (response.pagination.limit || records.length),
      };
    }

    return {
      data: records,
      total: records.length,
      limit: records.length,
      offset: 0,
    };
  }

  /**
   * 获取数据表的记录列表（GET /api/v1/tables/:tableId/records）
   * 后端返回格式：{ list: Record[], pagination?: {...} }
   */
  public async listTableRecords(
    tableId: string,
    params?: PaginationParams & {
      filter?: FilterExpression;
      sort?: SortExpression[];
    }
  ): Promise<PaginatedResponse<Record>> {
    const response = await this.httpClient.get<{ list: Record[]; pagination?: any }>(
      `/api/v1/tables/${tableId}/records`,
      params
    );
    const records = response?.list || [];

    if (response?.pagination) {
      return {
        data: records,
        total: response.pagination.total || records.length,
        limit: response.pagination.limit || records.length,
        offset:
          ((response.pagination.page || 1) - 1) * (response.pagination.limit || records.length),
      };
    }

    return {
      data: records,
      total: records.length,
      limit: records.length,
      offset: 0,
    };
  }

  /**
   * 获取记录详情（GET /api/v1/records/:id）
   */
  public async get(recordId: string): Promise<Record> {
    return this.httpClient.get<Record>(`/api/v1/records/${recordId}`);
  }

  /**
   * 更新记录（PATCH /api/v1/tables/:tableId/records/:recordId）
   * ✅ 对齐 Teable 架构：所有记录操作都需要 tableID
   */
  public async update(
    tableId: string,
    recordId: string,
    updates: UpdateRecordRequest
  ): Promise<Record> {
    return this.httpClient.patch<Record>(`/api/v1/tables/${tableId}/records/${recordId}`, updates);
  }

  /**
   * 删除记录（DELETE /api/v1/tables/:tableId/records/:recordId）
   * ✅ 对齐 Teable 架构：所有记录操作都需要 tableID
   */
  public async delete(tableId: string, recordId: string): Promise<void> {
    await this.httpClient.delete(`/api/v1/tables/${tableId}/records/${recordId}`);
  }

  // ==================== 批量操作 ====================

  /**
   * 批量创建记录（POST /api/v1/tables/:tableId/records/batch）
   */
  public async bulkCreate(bulkData: BulkCreateRecordRequest): Promise<Record[]> {
    const { tableId, records } = bulkData;
    // 后端期望格式: { records: [{fields: {...}}, {fields: {...}}] }
    const formattedRecords = records.map((record) => ({ fields: record }));
    const response = await this.httpClient.post<{
      records: Record[];
      successCount: number;
      failedCount: number;
    }>(`/api/v1/tables/${tableId}/records/batch`, { records: formattedRecords });
    // 后端返回格式: { records: [], successCount: n, failedCount: m }
    return response.records || [];
  }

  /**
   * 批量更新记录（PATCH /api/v1/tables/:tableId/records/batch）
   * ✅ 对齐新 API：使用包含 tableId 的路由
   */
  public async bulkUpdate(bulkData: BulkUpdateRecordRequest): Promise<Record[]> {
    const { tableId, records } = bulkData;
    return this.httpClient.patch<Record[]>(`/api/v1/tables/${tableId}/records/batch`, { records });
  }

  /**
   * 批量删除记录（DELETE /api/v1/tables/:tableId/records/batch）
   * ✅ 对齐 Teable 架构：所有记录操作都需要 tableID
   */
  public async bulkDelete(bulkData: BulkDeleteRecordRequest): Promise<void> {
    const { tableId, recordIds } = bulkData;
    await this.httpClient.delete(`/api/v1/tables/${tableId}/records/batch`, {
      data: { recordIds },
    } as any);
  }

  // ==================== 查询操作 ====================

  /**
   * 复杂查询
   * 注：当前API可能未实现，仅预留接口
   */
  public async query(query: RecordQuery): Promise<PaginatedResponse<Record>> {
    return this.httpClient.post<PaginatedResponse<Record>>('/api/v1/records/query', query);
  }

  /**
   * 搜索记录
   * 注：当前API可能未实现，仅预留接口
   */
  public async search(
    tableId: string,
    searchQuery: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<Record>> {
    return this.httpClient.get<PaginatedResponse<Record>>(`/api/v1/search`, {
      query: searchQuery,
      scope: 'records',
      tableId,
      ...(params || {}),
    } as any);
  }

  /**
   * 高级搜索
   * 注：当前API可能未实现，仅预留接口
   */
  public async advancedSearch(
    tableId: string,
    filters: FilterExpression[],
    params?: PaginationParams
  ): Promise<PaginatedResponse<Record>> {
    return this.httpClient.post<PaginatedResponse<Record>>(`/api/v1/search/advanced`, {
      scope: 'records',
      tableId,
      filters,
      ...(params || {}),
    } as any);
  }

  // ==================== 统计和聚合 ====================

  /**
   * 获取记录统计信息
   * 注：当前API可能未实现，仅预留接口
   */
  public async getStats(tableId: string): Promise<{
    totalRecords: number;
    createdToday: number;
    updatedToday: number;
    byField: JsonObject;
    lastActivityAt: string;
  }> {
    return this.httpClient.get(`/api/v1/tables/${tableId}/records/stats`);
  }

  /**
   * 获取字段统计
   * 注：当前API可能未实现，仅预留接口
   */
  public async getFieldStats(
    tableId: string,
    fieldId: string
  ): Promise<{
    fieldId: string;
    fieldName: string;
    fieldType: string;
    totalValues: number;
    uniqueValues: number;
    nullValues: number;
    distribution: globalThis.Record<string, number>;
  }> {
    return this.httpClient.get(`/api/v1/tables/${tableId}/fields/${fieldId}/stats`);
  }

  /**
   * 聚合查询
   * 注：当前API可能未实现，仅预留接口
   */
  public async aggregate(
    tableId: string,
    aggregation: {
      group_by?: string[];
      aggregations: Array<{
        field: string;
        function: 'count' | 'sum' | 'avg' | 'min' | 'max' | 'distinct';
        alias?: string;
      }>;
      filter?: FilterExpression;
    }
  ): Promise<any[]> {
    return this.httpClient.post(`/api/v1/tables/${tableId}/records/aggregate`, aggregation);
  }

  // ==================== 字段值操作 ====================

  /**
   * 更新单个字段值
   * 注：当前API可能未实现，仅预留接口
   */
  public async updateFieldValue(recordId: string, fieldId: string, value: any): Promise<Record> {
    return this.httpClient.patch<Record>(`/api/v1/records/${recordId}/fields/${fieldId}`, {
      value,
    });
  }

  /**
   * 获取字段值
   * 注：当前API可能未实现，仅预留接口
   */
  public async getFieldValue(recordId: string, fieldId: string): Promise<any> {
    return this.httpClient.get(`/api/v1/records/${recordId}/fields/${fieldId}`);
  }

  /**
   * 批量更新字段值
   * 注：当前API可能未实现，仅预留接口
   */
  public async bulkUpdateFieldValues(
    updates: Array<{
      recordId: string;
      fieldId: string;
      value: any;
    }>
  ): Promise<Record[]> {
    return this.httpClient.post<Record[]>('/api/v1/records/bulk-update-fields', { updates });
  }

  // ==================== 记录关系操作 ====================

  /**
   * 获取关联记录
   * 注：当前API可能未实现，仅预留接口
   */
  public async getLinkedRecords(
    recordId: string,
    linkFieldId: string,
    params?: PaginationParams
  ): Promise<PaginatedResponse<Record>> {
    return this.httpClient.get<PaginatedResponse<Record>>(
      `/api/v1/records/${recordId}/links/${linkFieldId}`,
      params
    );
  }

  /**
   * 添加关联记录
   * 注：当前API可能未实现，仅预留接口
   */
  public async addLinkedRecord(
    recordId: string,
    linkFieldId: string,
    linkedRecordId: string
  ): Promise<void> {
    await this.httpClient.post(`/api/v1/records/${recordId}/links/${linkFieldId}`, {
      linkedRecordId,
    });
  }

  /**
   * 移除关联记录
   * 注：当前API可能未实现，仅预留接口
   */
  public async removeLinkedRecord(
    recordId: string,
    linkFieldId: string,
    linkedRecordId: string
  ): Promise<void> {
    await this.httpClient.delete(
      `/api/v1/records/${recordId}/links/${linkFieldId}/${linkedRecordId}`
    );
  }

  /**
   * 批量添加关联记录
   * 注：当前API可能未实现，仅预留接口
   */
  public async bulkAddLinkedRecords(
    recordId: string,
    linkFieldId: string,
    linkedRecordIds: string[]
  ): Promise<void> {
    await this.httpClient.post(`/api/v1/records/${recordId}/links/${linkFieldId}/bulk`, {
      linkedRecordIds,
    });
  }

  // ==================== 记录版本管理 ====================

  /**
   * 获取记录版本历史
   * 注：当前API可能未实现，仅预留接口
   */
  public async getVersionHistory(
    recordId: string,
    params?: PaginationParams
  ): Promise<
    PaginatedResponse<{
      version: number;
      data: JsonObject;
      changes: JsonObject;
      updated_by: string;
      updated_at: string;
    }>
  > {
    return this.httpClient.get<PaginatedResponse<any>>(
      `/api/v1/records/${recordId}/versions`,
      params
    );
  }

  /**
   * 获取特定版本的记录
   * 注：当前API可能未实现，仅预留接口
   */
  public async getRecordVersion(recordId: string, version: number): Promise<Record> {
    return this.httpClient.get<Record>(`/api/v1/records/${recordId}/versions/${version}`);
  }

  /**
   * 恢复到特定版本
   * 注：当前API可能未实现，仅预留接口
   */
  public async restoreToVersion(recordId: string, version: number): Promise<Record> {
    return this.httpClient.post<Record>(`/api/v1/records/${recordId}/restore/${version}`);
  }

  // ==================== 导入导出 ====================

  /**
   * 导出记录
   * 注：当前API可能未实现，仅预留接口
   */
  public async exportRecords(
    tableId: string,
    format: 'json' | 'csv' | 'xlsx' = 'json',
    params?: {
      filter?: FilterExpression;
      fields?: string[];
    }
  ): Promise<Blob> {
    const query: any = { format };
    if (params?.filter) query.filter = JSON.stringify(params.filter);
    if (params?.fields) query.fields = params.fields.join(',');
    return this.httpClient.downloadFile(
      `/api/v1/tables/${tableId}/records/export?${new URLSearchParams(query).toString()}`
    );
  }

  /**
   * 导入记录
   * 注：当前API可能未实现，仅预留接口
   */
  public async importRecords(
    tableId: string,
    file: File | Buffer,
    options?: {
      updateExisting?: boolean;
      skipErrors?: boolean;
      fieldMapping?: globalThis.Record<string, string>;
    }
  ): Promise<{
    imported: number;
    updated: number;
    errors: Array<{ row: number; error: string }>;
  }> {
    return this.httpClient.uploadFile(
      `/api/v1/tables/${tableId}/records/import`,
      file,
      'file',
      options
    );
  }

  // ==================== 记录操作工具 ====================

  /**
   * 复制记录
   * 注：当前API可能未实现，仅预留接口
   */
  public async duplicate(recordId: string, newData?: JsonObject): Promise<Record> {
    return this.httpClient.post<Record>(`/api/v1/records/${recordId}/duplicate`, { data: newData });
  }

  /**
   * 移动记录到其他表
   * 注：当前API可能未实现，仅预留接口
   */
  public async moveToTable(
    recordId: string,
    targetTableId: string,
    fieldMapping?: globalThis.Record<string, string>
  ): Promise<Record> {
    return this.httpClient.post<Record>(`/api/v1/records/${recordId}/move`, {
      targetTableId,
      fieldMapping,
    });
  }

  /**
   * 验证记录数据
   * 注：当前API可能未实现，仅预留接口
   */
  public async validate(
    recordData: JsonObject,
    tableId: string
  ): Promise<{
    valid: boolean;
    errors: Array<{ field: string; error: string }>;
  }> {
    return this.httpClient.post(`/api/v1/tables/${tableId}/records/validate`, recordData);
  }

  // ==================== 查询构建器 ====================

  /**
   * 创建查询构建器
   */
  public queryBuilder(tableId: string): RecordQueryBuilder {
    return new RecordQueryBuilder(this, tableId);
  }
}

/**
 * 记录查询构建器
 * 提供链式 API 来构建复杂查询
 */
export class RecordQueryBuilder {
  private client: RecordClient;
  private query: RecordQuery;

  constructor(client: RecordClient, tableId: string) {
    this.client = client;
    this.query = {
      tableId: tableId, // ✅ 使用 camelCase
      filter: undefined,
      sort: [],
      limit: 20,
      offset: 0,
    };
  }

  public where(field: string, operator: FilterOperator, value: any): RecordQueryBuilder {
    if (!this.query.filter) {
      this.query.filter = { field, operator, value } as any;
    } else {
      // 构建复合条件
      this.query.filter = {
        logic: 'and',
        conditions: [this.query.filter as any, { field, operator, value } as any],
      } as any;
    }
    return this;
  }

  public orWhere(field: string, operator: FilterOperator, value: any): RecordQueryBuilder {
    if (!this.query.filter) {
      this.query.filter = { field, operator, value } as any;
    } else {
      this.query.filter = {
        logic: 'or',
        conditions: [this.query.filter as any, { field, operator, value } as any],
      } as any;
    }
    return this;
  }

  public orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): RecordQueryBuilder {
    if (!this.query.sort) {
      this.query.sort = [];
    }
    this.query.sort.push({ field, direction });
    return this;
  }

  public limit(count: number): RecordQueryBuilder {
    this.query.limit = count;
    return this;
  }

  public offset(count: number): RecordQueryBuilder {
    this.query.offset = count;
    return this;
  }

  public async execute(): Promise<PaginatedResponse<Record>> {
    return this.client.query(this.query);
  }

  public async first(): Promise<Record | null> {
    const result = await this.limit(1).execute();
    return result.data.length > 0 ? (result.data[0] as Record) : null;
  }

  public async count(): Promise<number> {
    const result = await this.limit(1).execute();
    return result.total;
  }
}

// ==================== ShareDB 实时协作功能 ====================

/**
 * 实时记录操作扩展
 */
export class RealtimeRecordClient extends RecordClient {
  /**
   * 实时更新记录字段
   */
  public async updateRecordFieldRealtime(
    tableId: string,
    recordId: string,
    fieldId: string,
    value: any
  ): Promise<void> {
    if (!this.documentManager) {
      throw new Error('ShareDB client not initialized. Call setShareDBClient() first.');
    }

    await this.documentManager.updateRecordField(tableId, recordId, fieldId, value);
  }

  /**
   * 批量实时更新记录字段
   */
  public async batchUpdateRecordFieldsRealtime(
    tableId: string,
    recordId: string,
    fields: Record<string, any>
  ): Promise<void> {
    if (!this.documentManager) {
      throw new Error('ShareDB client not initialized. Call setShareDBClient() first.');
    }

    await this.documentManager.batchUpdateRecordFields(tableId, recordId, fields);
  }

  /**
   * 实时删除记录字段
   */
  public async deleteRecordFieldRealtime(
    tableId: string,
    recordId: string,
    fieldId: string
  ): Promise<void> {
    if (!this.documentManager) {
      throw new Error('ShareDB client not initialized. Call setShareDBClient() first.');
    }

    await this.documentManager.deleteRecordField(tableId, recordId, fieldId);
  }

  /**
   * 订阅记录变更
   */
  public subscribeToRecord(
    tableId: string,
    recordId: string,
    callback: (updates: JsonObject) => void
  ) {
    if (!this.documentManager) {
      throw new Error('ShareDB client not initialized. Call setShareDBClient() first.');
    }

    return this.documentManager.subscribeToRecord(tableId, recordId, callback);
  }

  /**
   * 获取记录快照
   */
  public async getRecordSnapshot(tableId: string, recordId: string) {
    if (!this.documentManager) {
      throw new Error('ShareDB client not initialized. Call setShareDBClient() first.');
    }

    return this.documentManager.getRecordSnapshot(tableId, recordId);
  }

  /**
   * 查询记录（实时）
   */
  public async queryRecordsRealtime(tableId: string, query?: any, options?: any) {
    if (!this.documentManager) {
      throw new Error('ShareDB client not initialized. Call setShareDBClient() first.');
    }

    return this.documentManager.queryRecords(tableId, query, options);
  }

  /**
   * 检查 ShareDB 是否可用
   */
  public isRealtimeAvailable(): boolean {
    return !!(this.sharedbClient && this.documentManager);
  }

  /**
   * 获取 ShareDB 连接状态
   */
  public getRealtimeConnectionState(): 'connecting' | 'connected' | 'disconnected' {
    if (!this.sharedbClient) {
      return 'disconnected';
    }
    return this.sharedbClient.getConnectionState();
  }
}
