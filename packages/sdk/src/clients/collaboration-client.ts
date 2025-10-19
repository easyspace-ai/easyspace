/**
 * 协作客户端
 * 处理实时协作、在线状态、光标位置等功能
 */

import { HttpClient } from '../core/http-client';
import { WebSocketClient } from '../core/websocket-client';
import type { 
  CollaborationSession,
  CollaborationParticipant,
  Presence,
  CursorPosition,
  CollaborationMessage,
  RecordChangeMessage
} from '../types/index.js';

export class CollaborationClient {
  private httpClient: HttpClient;
  private wsClient: WebSocketClient | undefined;

  constructor(httpClient: HttpClient, wsClient?: WebSocketClient) {
    this.httpClient = httpClient;
    this.wsClient = wsClient;
  }

  // ==================== 协作会话管理 ====================

  /**
   * 创建协作会话
   */
  public async createSession(sessionData: {
    name: string;
    description?: string;
    resourceType: string;
    resourceId: string;
  }): Promise<CollaborationSession> {
    return this.httpClient.post<CollaborationSession>('/api/collaboration/sessions', sessionData);
  }

  /**
   * 获取协作会话列表
   */
  public async listSessions(params?: {
    limit?: number;
    offset?: number;
    resourceType?: string;
    resourceId?: string;
  }): Promise<{
    data: CollaborationSession[];
    total: number;
    limit: number;
    offset: number;
  }> {
    return this.httpClient.get('/api/collaboration/sessions', params);
  }

  /**
   * 获取协作会话详情
   */
  public async getSession(sessionId: string): Promise<CollaborationSession> {
    return this.httpClient.get<CollaborationSession>(`/api/collaboration/sessions/${sessionId}`);
  }

  /**
   * 更新协作会话
   */
  public async updateSession(sessionId: string, updates: {
    name?: string;
    description?: string;
  }): Promise<CollaborationSession> {
    return this.httpClient.put<CollaborationSession>(`/api/collaboration/sessions/${sessionId}`, updates);
  }

  /**
   * 结束协作会话
   */
  public async endSession(sessionId: string): Promise<void> {
    await this.httpClient.delete(`/api/collaboration/sessions/${sessionId}`);
  }

  /**
   * 加入协作会话
   */
  public async joinSession(sessionId: string): Promise<CollaborationParticipant> {
    return this.httpClient.post<CollaborationParticipant>(`/api/collaboration/sessions/${sessionId}/join`);
  }

  /**
   * 离开协作会话
   */
  public async leaveSession(sessionId: string): Promise<void> {
    await this.httpClient.post(`/api/collaboration/sessions/${sessionId}/leave`);
  }

  /**
   * 获取参与者列表
   */
  public async getParticipants(sessionId: string): Promise<CollaborationParticipant[]> {
    return this.httpClient.get<CollaborationParticipant[]>(`/api/collaboration/sessions/${sessionId}/participants`);
  }

  /**
   * 邀请参与协作
   */
  public async inviteToSession(sessionId: string, userIds: string[]): Promise<void> {
    await this.httpClient.post(`/api/collaboration/sessions/${sessionId}/invite`, { userIds });
  }

  /**
   * 移除参与者
   */
  public async removeParticipant(sessionId: string, userId: string): Promise<void> {
    await this.httpClient.post(`/api/collaboration/sessions/${sessionId}/kick`, { userId });
  }

  // ==================== 在线状态管理 ====================

  /**
   * 更新在线状态
   */
  public async updatePresence(resourceType: string, resourceId: string, cursorPosition?: CursorPosition): Promise<Presence> {
    const presence = await this.httpClient.post<Presence>('/api/collaboration/presence', {
      resourceType,
      resourceId,
      cursorPosition
    });

    // Note: Presence updates are sent via HTTP API
    // The WebSocket will receive broadcast updates from the server

    return presence;
  }

  /**
   * 移除在线状态
   */
  public async removePresence(): Promise<void> {
    await this.httpClient.delete('/api/collaboration/presence');
  }

  /**
   * 获取在线状态列表
   */
  public async getPresenceList(resourceType?: string, resourceId?: string): Promise<Presence[]> {
    return this.httpClient.get<Presence[]>('/api/collaboration/presence', {
      resourceType,
      resourceId
    });
  }

  // ==================== 光标位置管理 ====================

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
    await this.httpClient.post('/api/collaboration/cursor', {
      resourceType,
      resourceId,
      cursorPosition,
      fieldId,
      recordId
    });

    // Note: Cursor updates are sent via HTTP API
    // The WebSocket will receive broadcast updates from the server
  }

  /**
   * 移除光标位置
   */
  public async removeCursor(): Promise<void> {
    await this.httpClient.delete('/api/collaboration/cursor');
  }

  /**
   * 获取光标位置列表
   */
  public async getCursorList(resourceType?: string, resourceId?: string): Promise<Array<{
    userId: string;
    resourceType: string;
    resourceId: string;
    cursorPosition: CursorPosition;
    fieldId?: string;
    recordId?: string;
    lastSeen: string;
  }>> {
    return this.httpClient.get('/api/collaboration/cursor', {
      resourceType,
      resourceId
    });
  }

  // ==================== WebSocket 事件处理 ====================

  /**
   * 设置 WebSocket 客户端
   */
  public setWebSocketClient(wsClient: WebSocketClient): void {
    this.wsClient = wsClient;
    this.setupWebSocketEventHandlers();
  }

  private setupWebSocketEventHandlers(): void {
    if (!this.wsClient) return;

    // WebSocket 事件会通过下面的公开方法暴露给用户
  }

  // ==================== WebSocket 事件监听方法 ====================

  /**
   * 监听 WebSocket 连接成功事件
   */
  public onWebSocketConnected(callback: () => void): void {
    if (this.wsClient) {
      this.wsClient.on('connected', callback);
    }
  }

  /**
   * 监听 WebSocket 断开连接事件
   */
  public onWebSocketDisconnected(callback: (data: { code: number; reason: string }) => void): void {
    if (this.wsClient) {
      this.wsClient.on('disconnected', callback);
    }
  }

  /**
   * 监听 WebSocket 错误事件
   */
  public onWebSocketError(callback: (error: Error) => void): void {
    if (this.wsClient) {
      this.wsClient.on('error', callback);
    }
  }

  /**
   * 监听所有 WebSocket 消息
   */
  public onMessage(callback: (message: any) => void): void {
    if (this.wsClient) {
      this.wsClient.on('message', callback);
    }
  }

  /**
   * 监听操作消息
   */
  public onOperation(callback: (message: any) => void): void {
    if (this.wsClient) {
      this.wsClient.on('operation', callback);
    }
  }

  /**
   * 监听表格更新事件
   */
  public onTableUpdate(callback: (message: any) => void): void {
    if (this.wsClient) {
      this.wsClient.on('table_update', callback);
    }
  }

  /**
   * 监听记录更新事件
   */
  public onRecordUpdate(callback: (message: any) => void): void {
    if (this.wsClient) {
      this.wsClient.on('record_update', callback);
    }
  }

  /**
   * 监听视图更新事件
   */
  public onViewUpdate(callback: (message: any) => void): void {
    if (this.wsClient) {
      this.wsClient.on('view_update', callback);
    }
  }

  /**
   * 监听记录变更事件（兼容旧版本API）
   */
  public onRecordChange(callback: (message: RecordChangeMessage) => void): void {
    if (this.wsClient) {
      this.wsClient.on('record_change', callback);
    }
  }

  /**
   * 监听协作消息
   */
  public onCollaboration(callback: (message: CollaborationMessage) => void): void {
    if (this.wsClient) {
      this.wsClient.on('collaboration', callback);
    }
  }

  /**
   * 监听在线状态更新
   */
  public onPresenceUpdate(callback: (message: any) => void): void {
    if (this.wsClient) {
      this.wsClient.on('presence_update', callback);
    }
  }

  /**
   * 监听光标更新
   */
  public onCursorUpdate(callback: (message: any) => void): void {
    if (this.wsClient) {
      this.wsClient.on('cursor_update', callback);
    }
  }

  /**
   * 监听通知消息
   */
  public onNotification(callback: (message: any) => void): void {
    if (this.wsClient) {
      this.wsClient.on('notification', callback);
    }
  }

  /**
   * 移除所有事件监听器
   */
  public removeAllListeners(event?: string): void {
    if (this.wsClient) {
      if (event) {
        this.wsClient.off(event, () => {});
      }
      // Note: WebSocketClient 的 EventEmitter 实现需要支持 removeAllListeners
    }
  }

  // ==================== 实时协作方法 ====================

  /**
   * 订阅表格的实时更新
   */
  public subscribeToTable(tableId: string): void {
    if (this.wsClient) {
      this.wsClient.subscribeToTable(tableId);
    }
  }

  /**
   * 取消订阅表格
   */
  public unsubscribeFromTable(tableId: string): void {
    if (this.wsClient) {
      this.wsClient.unsubscribeFromTable(tableId);
    }
  }

  /**
   * 订阅记录的实时更新
   */
  public subscribeToRecord(tableId: string, recordId: string): void {
    if (this.wsClient) {
      this.wsClient.subscribeToRecord(tableId, recordId);
    }
  }

  /**
   * 取消订阅记录
   */
  public unsubscribeFromRecord(tableId: string, recordId: string): void {
    if (this.wsClient) {
      this.wsClient.unsubscribeFromRecord(tableId, recordId);
    }
  }

  /**
   * 订阅视图的实时更新
   */
  public subscribeToView(viewId: string): void {
    if (this.wsClient) {
      this.wsClient.subscribeToView(viewId);
    }
  }

  /**
   * 取消订阅视图
   */
  public unsubscribeFromView(viewId: string): void {
    if (this.wsClient) {
      this.wsClient.unsubscribeFromView(viewId);
    }
  }

  // ==================== 协作统计 ====================

  /**
   * 获取协作统计信息
   */
  public async getCollaborationStats(): Promise<{
    activeSessions: number;
    totalParticipants: number;
    onlineUsers: number;
    recentActivity: Array<{
      type: string;
      userId: string;
      resourceType: string;
      resourceId: string;
      timestamp: string;
    }>;
  }> {
    return this.httpClient.get('/api/collaboration/stats');
  }

  /**
   * 获取用户协作活动
   */
  public async getUserCollaborationActivity(userId: string, params?: {
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<{
    data: Array<{
      sessionId: string;
      resourceType: string;
      resourceId: string;
      action: string;
      timestamp: string;
    }>;
    total: number;
  }> {
    return this.httpClient.get(`/api/collaboration/users/${userId}/activity`, params);
  }

}
