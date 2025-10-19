/**
 * LuckDB SDK 主入口文件
 * 提供统一的 API 接口，类似 Airtable SDK 的设计模式
 */

import { HttpClient } from './core/http-client.js';
import { WebSocketClient } from './core/websocket-client.js';
import { ShareDBClient } from './core/sharedb-client.js';
import { DocumentManager } from './core/document-manager.js';
import { AuthClient } from './clients/auth-client.js';
import { SpaceClient } from './clients/space-client.js';
import { BaseClient } from './clients/base-client.js';
import { TableClient } from './clients/table-client.js';
import { FieldClient } from './clients/field-client.js';
import { RecordClient } from './clients/record-client.js';
import { ViewClient } from './clients/view-client.js';
import { CollaborationClient } from './clients/collaboration-client.js';

import type {
  LuckDBConfig,
  User,
  Space,
  Base,
  Table,
  Field,
  Record,
  View,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  CreateSpaceRequest,
  CreateBaseRequest,
  CreateTableRequest,
  UpdateTableRequest,
  RenameTableRequest,
  DuplicateTableRequest,
  TableUsageResponse,
  TableManagementMenu,
  CreateFieldRequest,
  UpdateFieldRequest,
  CreateRecordRequest,
  CreateViewRequest,
  PaginatedResponse,
  PaginationParams,
  FilterExpression,
  SortExpression,
  ViewType,
  ViewConfig,
  FieldType,
  FieldOptions,
  CollaborationSession,
  Presence,
  CursorPosition,
  WebSocketMessage,
  CollaborationMessage,
  RecordChangeMessage,
  JsonObject,
} from './types/index.js';

import {
  LuckDBError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
  RateLimitError,
  ServerError,
} from './types/index.js';

/**
 * LuckDB SDK 主类
 * 提供类似 Airtable SDK 的 API 设计
 */
export class LuckDB {
  private httpClient: HttpClient;
  private wsClient?: WebSocketClient;
  private sharedbClient?: ShareDBClient;
  private documentManager?: DocumentManager;
  private authClient: AuthClient;
  private spaceClient: SpaceClient;
  private baseClient: BaseClient;
  private tableClient: TableClient;
  private fieldClient: FieldClient;
  private recordClient: RecordClient;
  private viewClient: ViewClient;
  private collaborationClient: CollaborationClient;
  private config: LuckDBConfig; // ✅ 存储配置用于调试

  constructor(config: LuckDBConfig) {
    this.config = config; // ✅ 保存配置
    // 初始化 HTTP 客户端
    this.httpClient = new HttpClient(config);

    // 初始化各个功能客户端
    this.authClient = new AuthClient(this.httpClient);
    this.spaceClient = new SpaceClient(this.httpClient);
    this.baseClient = new BaseClient(this.httpClient);
    this.tableClient = new TableClient(this.httpClient);
    this.fieldClient = new FieldClient(this.httpClient);
    this.recordClient = new RecordClient(this.httpClient);
    this.viewClient = new ViewClient(this.httpClient);
    this.collaborationClient = new CollaborationClient(this.httpClient);

    // ✅ 总是初始化 WebSocket 客户端，即使没有 accessToken
    this.initializeWebSocket(config);
  }

  private initializeWebSocket(config: LuckDBConfig): void {
    const wsOptions = {
      debug: config.debug || false,
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
    } as any;

    this.wsClient = new WebSocketClient(config, wsOptions);
    this.collaborationClient.setWebSocketClient(this.wsClient);

    // 初始化 ShareDB 客户端
    this.initializeShareDB(config);

    // ✅ 添加调试日志
    if (config.debug) {
      console.log('[LuckDB SDK] WebSocket client initialized with options:', wsOptions);
    }
  }

  private initializeShareDB(config: LuckDBConfig): void {
    if (this.wsClient) {
      const sharedbConfig = {
        debug: config.debug || false,
        reconnectInterval: 5000,
        maxReconnectAttempts: 10,
        heartbeatInterval: 30000,
      };

      this.sharedbClient = new ShareDBClient(this.wsClient, sharedbConfig);
      this.documentManager = new DocumentManager(this.sharedbClient);

      // 设置记录客户端的 ShareDB 支持
      this.recordClient.setShareDBClient(this.sharedbClient, this.documentManager);

      if (config.debug) {
        console.log('[LuckDB SDK] ShareDB client initialized');
      }
    }
  }

  // ==================== 认证相关方法 ====================

  /**
   * 用户登录
   */
  public async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await this.authClient.login(credentials);
    console.log('登录成功:', response);

    // ✅ 登录成功后更新 WebSocket 客户端配置
    if (this.wsClient) {
      // 更新配置中的 accessToken
      this.wsClient.config.accessToken = response.accessToken;

      // 尝试连接 WebSocket
      await this.wsClient.connect();
    }

    return response;
  }

  /**
   * 用户注册
   */
  public async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await this.authClient.register(userData);

    // 注册成功后初始化 WebSocket 连接
    if (this.wsClient) {
      await this.wsClient.connect();
    }

    return response;
  }

  /**
   * 用户登出
   */
  public async logout(): Promise<void> {
    await this.authClient.logout();

    // 登出后断开 WebSocket 连接
    if (this.wsClient) {
      this.wsClient.disconnect();
    }
  }

  /**
   * 获取当前用户信息
   */
  public async getCurrentUser(): Promise<User> {
    return this.authClient.getCurrentUser();
  }

  /**
   * 检查是否已登录
   */
  public isAuthenticated(): boolean {
    return this.authClient.isAuthenticated();
  }

  // ==================== 空间管理方法 ====================

  /**
   * 创建空间
   */
  public async createSpace(spaceData: CreateSpaceRequest): Promise<Space> {
    return this.spaceClient.create(spaceData);
  }

  /**
   * 获取空间列表
   */
  public async listSpaces(params?: { search?: string }): Promise<Space[]> {
    return this.spaceClient.list(params);
  }

  /**
   * 获取空间详情
   */
  public async getSpace(spaceId: string): Promise<Space> {
    return this.spaceClient.get(spaceId);
  }

  /**
   * 更新空间
   */
  public async updateSpace(spaceId: string, updates: Partial<Space>): Promise<Space> {
    return this.spaceClient.update(spaceId, updates);
  }

  /**
   * 删除空间
   */
  public async deleteSpace(spaceId: string): Promise<void> {
    await this.spaceClient.delete(spaceId);
  }

  // ==================== 基础表管理方法 ====================

  /**
   * 创建基础表
   */
  public async createBase(baseData: CreateBaseRequest): Promise<Base> {
    return this.baseClient.createBase(baseData);
  }

  /**
   * 获取基础表列表
   */
  public async listBases(params?: { spaceId?: string }): Promise<Base[]> {
    return this.baseClient.listBases(params);
  }

  /**
   * 获取基础表详情
   */
  public async getBase(baseId: string): Promise<Base> {
    return this.baseClient.getBase(baseId);
  }

  /**
   * 更新基础表
   */
  public async updateBase(baseId: string, updates: Partial<Base>): Promise<Base> {
    return this.baseClient.updateBase(baseId, updates);
  }

  /**
   * 删除基础表
   */
  public async deleteBase(baseId: string): Promise<void> {
    await this.baseClient.deleteBase(baseId);
  }

  /**
   * 复制基础表
   */
  public async duplicateBase(baseId: string, data?: { name?: string }): Promise<Base> {
    return this.baseClient.duplicateBase(baseId, data);
  }

  /**
   * 获取基础表权限
   */
  public async getBasePermission(baseId: string): Promise<any> {
    return this.baseClient.getBasePermission(baseId);
  }

  /**
   * 获取基础表协作者列表
   */
  public async getBaseCollaborators(baseId: string): Promise<any[]> {
    return this.baseClient.getBaseCollaborators(baseId);
  }

  /**
   * 添加基础表协作者
   */
  public async addBaseCollaborator(
    baseId: string,
    data: { userId: string; role: string }
  ): Promise<any> {
    return this.baseClient.addBaseCollaborator(baseId, data);
  }

  // ==================== 数据表管理方法 ====================

  /**
   * 创建数据表
   */
  public async createTable(tableData: CreateTableRequest): Promise<Table> {
    return this.tableClient.createTable(tableData);
  }

  /**
   * 获取数据表列表
   * @param params 必须包含 baseId
   */
  public async listTables(params: { baseId: string }): Promise<Table[]> {
    return this.tableClient.listTables(params);
  }

  /**
   * 获取数据表详情
   */
  public async getTable(tableId: string): Promise<Table> {
    return this.tableClient.getTable(tableId);
  }

  /**
   * 更新数据表
   */
  public async updateTable(tableId: string, updates: Partial<Table>): Promise<Table> {
    return this.tableClient.updateTable(tableId, updates);
  }

  /**
   * 删除数据表
   */
  public async deleteTable(tableId: string): Promise<void> {
    await this.tableClient.deleteTable(tableId);
  }

  // ==================== 字段管理方法 ====================

  /**
   * 创建字段
   */
  public async createField(fieldData: CreateFieldRequest): Promise<Field> {
    return this.fieldClient.createField(fieldData);
  }

  /**
   * 获取字段列表
   */
  public async listFields(params?: { tableId?: string }): Promise<Field[]> {
    return this.fieldClient.listFields(params);
  }

  /**
   * 获取字段详情
   */
  public async getField(fieldId: string): Promise<Field> {
    return this.fieldClient.getField(fieldId);
  }

  /**
   * 更新字段
   */
  public async updateField(fieldId: string, updates: UpdateFieldRequest): Promise<Field> {
    return this.fieldClient.updateField(fieldId, updates);
  }

  /**
   * 删除字段
   */
  public async deleteField(fieldId: string): Promise<void> {
    await this.fieldClient.deleteField(fieldId);
  }

  // ==================== 记录管理方法 ====================

  /**
   * 创建记录
   */
  public async createRecord(recordData: CreateRecordRequest): Promise<Record> {
    return this.recordClient.create(recordData);
  }

  /**
   * 获取记录列表
   */
  public async listRecords(
    params?: PaginationParams & {
      tableId?: string;
      filter?: FilterExpression;
      sort?: SortExpression[];
    }
  ): Promise<PaginatedResponse<Record>> {
    return this.recordClient.list(params);
  }

  /**
   * 获取记录详情
   */
  public async getRecord(recordId: string): Promise<Record> {
    return this.recordClient.get(recordId);
  }

  /**
   * 更新记录
   * @param options - 可选参数，如 version（用于乐观锁）或 data（更新数据）
   */
  public async updateRecord(
    tableId: string,
    recordId: string,
    updates: JsonObject | { data: JsonObject; version?: number },
    options?: { version?: number }
  ): Promise<Record> {
    // 兼容两种调用方式：
    // 1. updateRecord(tableId, recordId, { field: value })
    // 2. updateRecord(tableId, recordId, { data: {...}, version: 1 })
    // 3. updateRecord(tableId, recordId, { field: value }, { version: 1 })

    let request: { data: JsonObject; version?: number };

    if ('data' in updates && updates.data) {
      // 方式2：传递完整的 UpdateRecordRequest 对象
      request = updates as { data: JsonObject; version?: number };
      if (this.config.debug) {
        console.log('[updateRecord] 方式2: 完整对象', { version: request.version });
      }
    } else {
      // 方式1或3：updates 是纯数据对象
      request = {
        data: updates as JsonObject,
        version: options?.version,
      };
      if (this.config.debug) {
        console.log('[updateRecord] 方式1/3: 纯数据+options', {
          hasOptions: !!options,
          version: options?.version,
        });
      }
    }

    if (this.config.debug) {
      console.log('[updateRecord] 最终请求', { version: request.version });
    }

    return this.recordClient.update(tableId, recordId, request);
  }

  /**
   * 删除记录
   */
  public async deleteRecord(tableId: string, recordId: string): Promise<void> {
    await this.recordClient.delete(tableId, recordId);
  }

  /**
   * 批量创建记录
   */
  public async bulkCreateRecords(tableId: string, records: JsonObject[]): Promise<Record[]> {
    return this.recordClient.bulkCreate({ tableId, records });
  }

  /**
   * 批量更新记录
   * ✅ 更新为需要 tableId 参数，对齐新 API
   */
  public async bulkUpdateRecords(
    tableId: string,
    updates: Array<{ id: string; data: JsonObject }>
  ): Promise<Record[]> {
    return this.recordClient.bulkUpdate({ tableId, records: updates });
  }

  /**
   * 批量删除记录
   */
  public async bulkDeleteRecords(tableId: string, recordIds: string[]): Promise<void> {
    await this.recordClient.bulkDelete({ tableId, recordIds }); // ✅ 使用 camelCase
  }

  // ==================== 视图管理方法 ====================

  /**
   * 创建视图
   */
  public async createView(viewData: CreateViewRequest): Promise<View> {
    return this.viewClient.create(viewData);
  }

  /**
   * 获取视图列表
   */
  public async listViews(params?: { tableId?: string }): Promise<View[]> {
    return this.viewClient.list(params);
  }

  /**
   * 获取视图详情
   */
  public async getView(viewId: string): Promise<View> {
    return this.viewClient.get(viewId);
  }

  /**
   * 更新视图
   */
  public async updateView(viewId: string, updates: Partial<View>): Promise<View> {
    return this.viewClient.update(viewId, updates);
  }

  /**
   * 删除视图
   */
  public async deleteView(viewId: string): Promise<void> {
    await this.viewClient.delete(viewId);
  }

  // ==================== 协作功能方法 ====================

  /**
   * 创建协作会话
   */
  public async createCollaborationSession(sessionData: {
    name: string;
    description?: string;
    resourceType: string;
    resourceId: string;
  }): Promise<CollaborationSession> {
    return this.collaborationClient.createSession(sessionData);
  }

  /**
   * 更新在线状态
   */
  public async updatePresence(
    resourceType: string,
    resourceId: string,
    cursorPosition?: CursorPosition
  ): Promise<Presence> {
    return this.collaborationClient.updatePresence(resourceType, resourceId, cursorPosition);
  }

  /**
   * 更新光标位置
   */
  public async updateCursor(
    resourceType: string,
    resourceId: string,
    cursorPosition: CursorPosition,
    fieldId?: string,
    recordId?: string
  ): Promise<void> {
    return this.collaborationClient.updateCursor(
      resourceType,
      resourceId,
      cursorPosition,
      fieldId,
      recordId
    );
  }

  /**
   * 订阅表格的实时更新
   */
  public subscribeToTable(tableId: string): void {
    this.collaborationClient.subscribeToTable(tableId);
  }

  /**
   * 订阅记录的实时更新
   */
  public subscribeToRecord(tableId: string, recordId: string): void {
    this.collaborationClient.subscribeToRecord(tableId, recordId);
  }

  /**
   * 订阅视图的实时更新
   */
  public subscribeToView(viewId: string): void {
    this.collaborationClient.subscribeToView(viewId);
  }

  // ==================== 事件监听方法 ====================

  /**
   * 监听协作事件
   */
  public onCollaboration(callback: (message: CollaborationMessage) => void): void {
    this.collaborationClient.onCollaboration(callback);
  }

  /**
   * 监听记录变更事件
   */
  public onRecordChange(callback: (message: RecordChangeMessage) => void): void {
    this.collaborationClient.onRecordChange(callback);
  }

  /**
   * 监听在线状态更新事件
   */
  public onPresenceUpdate(callback: (message: WebSocketMessage) => void): void {
    this.collaborationClient.onPresenceUpdate(callback);
  }

  /**
   * 监听光标更新事件
   */
  public onCursorUpdate(callback: (message: WebSocketMessage) => void): void {
    this.collaborationClient.onCursorUpdate(callback);
  }

  /**
   * 监听通知事件
   */
  public onNotification(callback: (message: WebSocketMessage) => void): void {
    this.collaborationClient.onNotification(callback);
  }

  // ==================== 工具方法 ====================

  /**
   * 获取系统健康状态
   */
  public async healthCheck(): Promise<{ status: string; timestamp: string; version: string }> {
    return this.httpClient.healthCheck();
  }

  /**
   * 获取系统信息
   */
  public async getSystemInfo(): Promise<any> {
    return this.httpClient.getSystemInfo();
  }

  /**
   * 获取 WebSocket 连接状态
   */
  public getWebSocketState(): 'connecting' | 'connected' | 'disconnected' {
    return this.wsClient?.getConnectionState() || 'disconnected';
  }

  /**
   * 手动连接 WebSocket
   */
  public async connectWebSocket(): Promise<void> {
    if (this.wsClient) {
      await this.wsClient.connect();
    }
  }

  /**
   * 断开 WebSocket 连接
   */
  public disconnectWebSocket(): void {
    if (this.wsClient) {
      this.wsClient.disconnect();
    }
  }

  /**
   * 设置访问令牌
   */
  public setAccessToken(token: string): void {
    this.httpClient.setAccessToken(token);
  }

  /**
   * 设置刷新令牌
   */
  public setRefreshToken(token: string): void {
    this.httpClient.setRefreshToken(token);
  }

  /**
   * 清除所有令牌
   */
  public clearTokens(): void {
    this.httpClient.clearTokens();
  }

  public setTokenRefreshCallback(
    callback: (accessToken: string, refreshToken: string) => void
  ): void {
    this.httpClient.setTokenRefreshCallback(callback);
  }

  // ==================== 客户端访问器 ====================

  /**
   * 获取认证客户端
   */
  public get auth(): AuthClient {
    return this.authClient;
  }

  /**
   * 获取空间客户端
   */
  public get spaces(): SpaceClient {
    return this.spaceClient;
  }

  /**
   * 获取表格客户端
   */
  public get tables(): TableClient {
    return this.tableClient;
  }

  /**
   * 获取字段客户端
   */
  public get fields(): FieldClient {
    return this.fieldClient;
  }

  /**
   * 获取记录客户端
   */
  public get records(): RecordClient {
    return this.recordClient;
  }

  /**
   * 获取视图客户端
   */
  public get views(): ViewClient {
    return this.viewClient;
  }

  /**
   * 获取协作客户端
   */
  public get collaboration(): CollaborationClient {
    return this.collaborationClient;
  }

  /**
   * 获取 WebSocket 客户端
   */
  public getWebSocketClient(): WebSocketClient | undefined {
    return this.wsClient;
  }

  // ==================== ShareDB 实时协作方法 ====================

  /**
   * 获取 ShareDB 客户端
   */
  public getShareDBClient(): ShareDBClient | undefined {
    return this.sharedbClient;
  }

  /**
   * 获取文档管理器
   */
  public getDocumentManager(): DocumentManager | undefined {
    return this.documentManager;
  }

  /**
   * 检查 ShareDB 是否可用
   */
  public isShareDBAvailable(): boolean {
    return !!(this.sharedbClient && this.documentManager);
  }

  /**
   * 获取 ShareDB 连接状态
   */
  public getShareDBConnectionState(): 'connecting' | 'connected' | 'disconnected' {
    if (!this.sharedbClient) {
      return 'disconnected';
    }
    return this.sharedbClient.getConnectionState();
  }

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
      throw new Error('ShareDB client not initialized');
    }
    await this.documentManager.updateRecordField(tableId, recordId, fieldId, value);
  }

  /**
   * 批量实时更新记录字段
   */
  public async batchUpdateRecordFieldsRealtime(
    tableId: string,
    recordId: string,
    fields: globalThis.Record<string, any>
  ): Promise<void> {
    if (!this.documentManager) {
      throw new Error('ShareDB client not initialized');
    }
    await this.documentManager.batchUpdateRecordFields(tableId, recordId, fields);
  }

  /**
   * 订阅记录变更（ShareDB 实时）
   */
  public subscribeToRecordRealtime(
    tableId: string,
    recordId: string,
    callback: (updates: JsonObject) => void
  ) {
    if (!this.documentManager) {
      throw new Error('ShareDB client not initialized');
    }
    return this.documentManager.subscribeToRecord(tableId, recordId, callback);
  }

  /**
   * 订阅字段变更（ShareDB 实时）
   */
  public subscribeToFieldRealtime(
    tableId: string,
    fieldId: string,
    callback: (updates: JsonObject) => void
  ) {
    if (!this.documentManager) {
      throw new Error('ShareDB client not initialized');
    }
    return this.documentManager.subscribeToField(tableId, fieldId, callback);
  }

  /**
   * 订阅视图变更（ShareDB 实时）
   */
  public subscribeToViewRealtime(
    tableId: string,
    viewId: string,
    callback: (updates: JsonObject) => void
  ) {
    if (!this.documentManager) {
      throw new Error('ShareDB client not initialized');
    }
    return this.documentManager.subscribeToView(tableId, viewId, callback);
  }

  /**
   * 订阅表格变更（ShareDB 实时）
   */
  public subscribeToTableRealtime(tableId: string, callback: (updates: JsonObject) => void) {
    if (!this.documentManager) {
      throw new Error('ShareDB client not initialized');
    }
    return this.documentManager.subscribeToTable(tableId, callback);
  }
}

// ==================== 导出所有类型和类 ====================

// 别名导出（向后兼容）
export { LuckDB as LuckDBSDK };

export {
  // 核心类
  HttpClient,
  WebSocketClient,
  ShareDBClient,
  DocumentManager,

  // 客户端类
  AuthClient,
  SpaceClient,
  TableClient,
  FieldClient,
  RecordClient,
  ViewClient,
  CollaborationClient,

  // 错误类
  LuckDBError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
  RateLimitError,
  ServerError,
};

// 类型导出
export type {
  LuckDBConfig,
  User,
  Space,
  Base,
  Table,
  Field,
  Record,
  View,
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  CreateSpaceRequest,
  CreateBaseRequest,
  CreateTableRequest,
  CreateFieldRequest,
  CreateRecordRequest,
  CreateViewRequest,
  PaginatedResponse,
  PaginationParams,
  FilterExpression,
  SortExpression,
  ViewType,
  ViewConfig,
  FieldType,
  FieldOptions,
  CollaborationSession,
  Presence,
  CursorPosition,
  WebSocketMessage,
  CollaborationMessage,
  RecordChangeMessage,
  JsonObject,
};

// 默认导出主类
export default LuckDB;
