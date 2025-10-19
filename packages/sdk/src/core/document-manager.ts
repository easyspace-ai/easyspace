/**
 * 文档管理器
 * 管理 ShareDB 文档的生命周期和操作
 */

import type { ShareDBClient, Document, Snapshot, OTOperation } from './sharedb-client.js';
import { OperationBuilder } from './operation-builder.js';
import type { JsonObject } from '../types/index.js';

/**
 * 文档管理器类
 * 提供便捷的方法来管理不同类型的文档
 */
export class DocumentManager {
  private sharedbClient: ShareDBClient;
  private documents: Map<string, Document>;

  constructor(sharedbClient: ShareDBClient) {
    this.sharedbClient = sharedbClient;
    this.documents = new Map();
  }

  /**
   * 获取记录文档
   */
  getRecordDocument(tableId: string, recordId: string): Document {
    const collection = `record_${tableId}`;
    const docKey = `${collection}:${recordId}`;

    if (!this.documents.has(docKey)) {
      const doc = this.sharedbClient.getDocument(collection, recordId);
      this.documents.set(docKey, doc);
    }

    return this.documents.get(docKey)!;
  }

  /**
   * 获取字段文档
   */
  getFieldDocument(tableId: string, fieldId: string): Document {
    const collection = `field_${tableId}`;
    const docKey = `${collection}:${fieldId}`;

    if (!this.documents.has(docKey)) {
      const doc = this.sharedbClient.getDocument(collection, fieldId);
      this.documents.set(docKey, doc);
    }

    return this.documents.get(docKey)!;
  }

  /**
   * 获取视图文档
   */
  getViewDocument(tableId: string, viewId: string): Document {
    const collection = `view_${tableId}`;
    const docKey = `${collection}:${viewId}`;

    if (!this.documents.has(docKey)) {
      const doc = this.sharedbClient.getDocument(collection, viewId);
      this.documents.set(docKey, doc);
    }

    return this.documents.get(docKey)!;
  }

  /**
   * 获取表格文档
   */
  getTableDocument(tableId: string): Document {
    const collection = `table_${tableId}`;
    const docKey = `${collection}:${tableId}`;

    if (!this.documents.has(docKey)) {
      const doc = this.sharedbClient.getDocument(collection, tableId);
      this.documents.set(docKey, doc);
    }

    return this.documents.get(docKey)!;
  }

  /**
   * 更新记录字段
   */
  async updateRecordField(
    tableId: string,
    recordId: string,
    fieldId: string,
    value: any
  ): Promise<void> {
    const doc = this.getRecordDocument(tableId, recordId);
    const op = OperationBuilder.setRecordField(fieldId, value);
    await doc.submitOp([op]);
  }

  /**
   * 批量更新记录字段
   */
  async batchUpdateRecordFields(
    tableId: string,
    recordId: string,
    fields: Record<string, any>
  ): Promise<void> {
    const doc = this.getRecordDocument(tableId, recordId);
    const ops = OperationBuilder.batchSetRecordFields(fields);
    await doc.submitOp(ops);
  }

  /**
   * 删除记录字段
   */
  async deleteRecordField(tableId: string, recordId: string, fieldId: string): Promise<void> {
    const doc = this.getRecordDocument(tableId, recordId);
    const op = OperationBuilder.deleteRecordField(fieldId);
    await doc.submitOp([op]);
  }

  /**
   * 更新字段属性
   */
  async updateFieldProperty(
    tableId: string,
    fieldId: string,
    key: string,
    value: any
  ): Promise<void> {
    const doc = this.getFieldDocument(tableId, fieldId);
    const op = OperationBuilder.setFieldProperty(key, value);
    await doc.submitOp([op]);
  }

  /**
   * 更新视图属性
   */
  async updateViewProperty(
    tableId: string,
    viewId: string,
    key: string,
    value: any
  ): Promise<void> {
    const doc = this.getViewDocument(tableId, viewId);
    const op = OperationBuilder.setViewProperty(key, value);
    await doc.submitOp([op]);
  }

  /**
   * 更新表格属性
   */
  async updateTableProperty(tableId: string, key: string, value: any): Promise<void> {
    const doc = this.getTableDocument(tableId);
    const op = OperationBuilder.setTableProperty(key, value);
    await doc.submitOp([op]);
  }

  /**
   * 订阅记录变更
   */
  subscribeToRecord(tableId: string, recordId: string, callback: (updates: JsonObject) => void) {
    const doc = this.getRecordDocument(tableId, recordId);
    return doc.subscribe((ops) => {
      const updates = this.parseOperationsToUpdates(ops);
      callback(updates);
    });
  }

  /**
   * 订阅字段变更
   */
  subscribeToField(tableId: string, fieldId: string, callback: (updates: JsonObject) => void) {
    const doc = this.getFieldDocument(tableId, fieldId);
    return doc.subscribe((ops) => {
      const updates = this.parseOperationsToUpdates(ops);
      callback(updates);
    });
  }

  /**
   * 订阅视图变更
   */
  subscribeToView(tableId: string, viewId: string, callback: (updates: JsonObject) => void) {
    const doc = this.getViewDocument(tableId, viewId);
    return doc.subscribe((ops) => {
      const updates = this.parseOperationsToUpdates(ops);
      callback(updates);
    });
  }

  /**
   * 订阅表格变更
   */
  subscribeToTable(tableId: string, callback: (updates: JsonObject) => void) {
    const doc = this.getTableDocument(tableId);
    return doc.subscribe((ops) => {
      const updates = this.parseOperationsToUpdates(ops);
      callback(updates);
    });
  }

  /**
   * 获取记录快照
   */
  async getRecordSnapshot(tableId: string, recordId: string): Promise<Snapshot> {
    const collection = `record_${tableId}`;
    return this.sharedbClient.getSnapshot(collection, recordId);
  }

  /**
   * 获取字段快照
   */
  async getFieldSnapshot(tableId: string, fieldId: string): Promise<Snapshot> {
    const collection = `field_${tableId}`;
    return this.sharedbClient.getSnapshot(collection, fieldId);
  }

  /**
   * 获取视图快照
   */
  async getViewSnapshot(tableId: string, viewId: string): Promise<Snapshot> {
    const collection = `view_${tableId}`;
    return this.sharedbClient.getSnapshot(collection, viewId);
  }

  /**
   * 获取表格快照
   */
  async getTableSnapshot(tableId: string): Promise<Snapshot> {
    const collection = `table_${tableId}`;
    return this.sharedbClient.getSnapshot(collection, tableId);
  }

  /**
   * 查询记录
   */
  async queryRecords(
    tableId: string,
    query?: any,
    options?: any
  ): Promise<{ snapshots: Snapshot[]; extra?: any }> {
    const collection = `record_${tableId}`;
    return this.sharedbClient.query(collection, query, options);
  }

  /**
   * 查询字段
   */
  async queryFields(
    tableId: string,
    query?: any,
    options?: any
  ): Promise<{ snapshots: Snapshot[]; extra?: any }> {
    const collection = `field_${tableId}`;
    return this.sharedbClient.query(collection, query, options);
  }

  /**
   * 查询视图
   */
  async queryViews(
    tableId: string,
    query?: any,
    options?: any
  ): Promise<{ snapshots: Snapshot[]; extra?: any }> {
    const collection = `view_${tableId}`;
    return this.sharedbClient.query(collection, query, options);
  }

  /**
   * 解析操作到更新对象
   */
  private parseOperationsToUpdates(ops: OTOperation[]): JsonObject {
    const updates: JsonObject = {};

    for (const op of ops) {
      if (op.p && op.p.length > 0) {
        const key = op.p.join('.');

        if (op.oi !== undefined) {
          // 插入或更新操作
          updates[key] = op.oi;
        } else if (op.od !== undefined) {
          // 删除操作
          updates[key] = null;
        }
      }
    }

    return updates;
  }

  /**
   * 销毁文档
   */
  destroyDocument(collection: string, id: string): void {
    const docKey = `${collection}:${id}`;
    const doc = this.documents.get(docKey);

    if (doc) {
      doc.destroy();
      this.documents.delete(docKey);
    }
  }

  /**
   * 销毁记录文档
   */
  destroyRecordDocument(tableId: string, recordId: string): void {
    const collection = `record_${tableId}`;
    this.destroyDocument(collection, recordId);
  }

  /**
   * 销毁字段文档
   */
  destroyFieldDocument(tableId: string, fieldId: string): void {
    const collection = `field_${tableId}`;
    this.destroyDocument(collection, fieldId);
  }

  /**
   * 销毁视图文档
   */
  destroyViewDocument(tableId: string, viewId: string): void {
    const collection = `view_${tableId}`;
    this.destroyDocument(collection, viewId);
  }

  /**
   * 销毁表格文档
   */
  destroyTableDocument(tableId: string): void {
    const collection = `table_${tableId}`;
    this.destroyDocument(collection, tableId);
  }

  /**
   * 清理所有文档
   */
  destroyAll(): void {
    for (const [docKey, doc] of this.documents.entries()) {
      doc.destroy();
    }
    this.documents.clear();
  }

  /**
   * 获取活跃文档数量
   */
  getActiveDocumentCount(): number {
    return this.documents.size;
  }

  /**
   * 获取活跃文档列表
   */
  getActiveDocuments(): string[] {
    return Array.from(this.documents.keys());
  }
}
