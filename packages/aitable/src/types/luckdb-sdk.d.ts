/**
 * EasySpace SDK 类型定义（模拟）
 * 用于构建时类型检查，实际使用时需要安装真实的 @easyspace/sdk 包
 */

declare module "@easyspace/sdk" {
  export interface LuckDB {
    // 基础方法
    connect(): Promise<void>;
    disconnect(): Promise<void>;

    // 空间操作
    listBases(): Promise<any[]>;
    getBase(id: string): Promise<any>;

    // 表操作
    listTables(params: { baseId: string }): Promise<any[]>;
    createTable(data: any): Promise<any>;
    getTable(tableId: string): Promise<any>;
    updateTable(tableId: string, data: any): Promise<any>;
    deleteTable(tableId: string): Promise<any>;

    // 字段操作
    listFields(params: { tableId: string }): Promise<any[]>;
    getField(fieldId: string): Promise<any>;
    createField(data: any): Promise<any>;
    updateField(fieldId: string, data: any): Promise<any>;
    deleteField(fieldId: string): Promise<any>;

    // 记录操作
    listRecords(params: any): Promise<any>;
    getRecord(recordId: string): Promise<any>;
    createRecord(data: any): Promise<any>;
    updateRecord(recordId: string, data: any): Promise<any>;
    deleteRecord(recordId: string): Promise<any>;

    // 视图操作
    listViews(params: { tableId: string }): Promise<any[]>;
    getView(viewId: string): Promise<any>;
    createView(data: any): Promise<any>;
    updateView(viewId: string, data: any): Promise<any>;
    deleteView(viewId: string): Promise<any>;
  }

  export interface LuckDBSDK {
    new (config: any): LuckDB;
  }

  export const LuckDB: LuckDBSDK;
  export const LuckDBSDK: LuckDBSDK;

  // 导出类型
  export interface LuckDBConfig {
    baseUrl: string;
    debug?: boolean;
  }

  export interface User {
    id: string;
    email: string;
    name: string;
  }

  export interface Space {
    id: string;
    name: string;
    description?: string;
  }

  export interface Base {
    id: string;
    name: string;
    spaceId: string;
  }

  export interface Table {
    id: string;
    name: string;
    baseId: string;
  }

  export interface Field {
    id: string;
    name: string;
    type: string;
    tableId: string;
  }

  export interface Record {
    id: string;
    data: Record<string, any>;
    tableId: string;
  }

  export interface View {
    id: string;
    name: string;
    type: string;
    tableId: string;
  }

  export interface LoginRequest {
    email: string;
    password: string;
  }

  export interface RegisterRequest {
    email: string;
    password: string;
    name: string;
  }

  export interface CreateSpaceRequest {
    name: string;
    description?: string;
  }

  export interface CreateBaseRequest {
    name: string;
    spaceId: string;
  }

  export interface CreateTableRequest {
    name: string;
    baseId: string;
  }

  export interface CreateFieldRequest {
    name: string;
    type: string;
    tableId: string;
    options?: any;
  }

  export interface CreateRecordRequest {
    tableId: string;
    data: Record<string, any>;
  }

  export interface CreateViewRequest {
    name: string;
    type: string;
    tableId: string;
    config?: any;
  }

  export interface AuthResponse {
    user: User;
    token: string;
  }

  export interface FilterExpression {
    field: string;
    operator: string;
    value: any;
  }

  export interface SortExpression {
    field: string;
    direction: "asc" | "desc";
  }

  export interface ViewConfig {
    groupBy?: string;
    sortBy?: SortExpression[];
    filterBy?: FilterExpression[];
  }

  export interface CollaborationSession {
    id: string;
    userId: string;
    tableId: string;
  }

  export interface Presence {
    userId: string;
    cursor: CursorPosition;
    timestamp: number;
  }

  export interface CursorPosition {
    x: number;
    y: number;
    cellId?: string;
  }

  export interface WebSocketMessage {
    type: string;
    data: any;
  }

  export interface CollaborationMessage {
    type: string;
    sessionId: string;
    data: any;
  }

  export interface RecordChangeMessage {
    type: "create" | "update" | "delete";
    recordId: string;
    data?: any;
  }

  export interface JsonObject {
    [key: string]: any;
  }
}
