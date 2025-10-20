/**
 * YJS 客户端实现
 * 提供基于 YJS 的实时协作和 CRDT 同步功能
 */

// 简单的 EventEmitter 实现，兼容浏览器环境
class EventEmitter {
  private events: Map<string, Function[]> = new Map();

  on(event: string, listener: Function): this {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(listener);
    return this;
  }

  off(event: string, listener: Function): this {
    const listeners = this.events.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    const listeners = this.events.get(event);
    if (listeners && listeners.length > 0) {
      listeners.forEach((listener) => listener(...args));
      return true;
    }
    return false;
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
    return this;
  }
}

import type { LuckDBConfig } from '../types/index.js';

export interface YjsClientOptions {
  debug?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

/**
 * YJS 文档类型
 */
export interface YjsDocument {
  id: string;
  data: any;
  version: number;
  subscribe(callback: (update: Uint8Array) => void): () => void;
  applyUpdate(update: Uint8Array): void;
  getUpdate(): Uint8Array;
  destroy(): void;
}

/**
 * YJS 连接状态
 */
export type YjsConnectionState = 'connecting' | 'connected' | 'disconnected';

/**
 * YJS 消息类型
 */
export interface YjsMessage {
  type: 'sync' | 'update' | 'awareness' | 'ping' | 'pong' | 'connected' | 'error';
  document?: string;
  update?: Uint8Array;
  state?: Uint8Array;
  awareness?: Uint8Array;
  user_id?: string;
}

/**
 * YJS 客户端类
 * 管理 YJS 连接和文档操作
 */
export class YjsClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: LuckDBConfig;
  private options: YjsClientOptions;
  private connectionState: YjsConnectionState = 'disconnected';
  private documents: Map<string, YjsDocument> = new Map();
  private subscriptions: Map<string, Function[]> = new Map();
  private reconnectAttempts: number = 0;
  private reconnectTimer: any | undefined;
  private heartbeatTimer: any | undefined;
  private isConnecting: boolean = false;

  constructor(config: LuckDBConfig, options: YjsClientOptions = {}) {
    super();
    this.config = config;
    this.options = {
      debug: false,
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      ...options,
    };
  }

  /**
   * 连接 YJS WebSocket
   */
  public async connect(): Promise<void> {
    if (this.isConnecting || this.connectionState === 'connected') {
      return;
    }

    if (!this.config.accessToken) {
      if (this.options.debug) {
        console.log('[YJS Client] Cannot connect: no access token');
      }
      return;
    }

    this.isConnecting = true;
    this.connectionState = 'connecting';

    return new Promise((resolve, reject) => {
      try {
        // 构建 WebSocket URL
        let wsUrl = this.config.baseUrl
          .replace(/^https:\/\//, 'wss://')
          .replace(/^http:\/\//, 'ws://');

        // 移除可能的 /api/v1 后缀
        wsUrl = wsUrl.replace(/\/api\/v1$/, '');

        // 从 token 中解析用户ID
        let userId = '';
        try {
          if (this.config.accessToken) {
            const payload = JSON.parse(atob(this.config.accessToken.split('.')[1]));
            userId = payload.user_id || '';
          }
        } catch (e) {
          console.warn('[YJS Client] Failed to parse user_id from token:', e);
        }

        // YJS WebSocket 端点
        const url = `${wsUrl}/yjs/ws?user=${userId}&token=${this.config.accessToken}`;

        if (this.options.debug) {
          console.log('[YJS Client] Connecting to:', url);
        }

        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
          this.handleOpen();
          resolve();
        };

        this.ws.onmessage = this.handleMessage.bind(this);
        this.ws.onclose = this.handleClose.bind(this);
        this.ws.onerror = (error) => {
          this.handleError(error);
          if (this.isConnecting) {
            this.isConnecting = false;
            reject(error);
          }
        };
      } catch (error) {
        this.isConnecting = false;
        this.emit('error', error);
        reject(error);
      }
    });
  }

  /**
   * 断开连接
   */
  public disconnect(): void {
    this.clearTimers();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.connectionState = 'disconnected';
    this.isConnecting = false;
    this.reconnectAttempts = 0;
  }

  /**
   * 获取或创建文档
   */
  public getDocument(documentId: string): YjsDocument {
    if (!this.documents.has(documentId)) {
      const doc = this.createDocument(documentId);
      this.documents.set(documentId, doc);
    }
    return this.documents.get(documentId)!;
  }

  /**
   * 创建文档
   */
  private createDocument(documentId: string): YjsDocument {
    const doc: YjsDocument = {
      id: documentId,
      data: {},
      version: 0,
      subscribe: (callback: (update: Uint8Array) => void) => {
        return this.subscribeToDocument(documentId, callback);
      },
      applyUpdate: (update: Uint8Array) => {
        this.applyDocumentUpdate(documentId, update);
      },
      getUpdate: () => {
        return this.getDocumentUpdate(documentId);
      },
      destroy: () => {
        this.destroyDocument(documentId);
      },
    };

    return doc;
  }

  /**
   * 订阅文档变更
   */
  private subscribeToDocument(documentId: string, callback: (update: Uint8Array) => void): () => void {
    if (!this.subscriptions.has(documentId)) {
      this.subscriptions.set(documentId, []);
    }
    this.subscriptions.get(documentId)!.push(callback);

    // 发送订阅消息
    this.sendMessage({
      type: 'sync',
      document: documentId,
    });

    if (this.options.debug) {
      console.log('[YJS Client] Subscribed to document:', documentId);
    }

    // 返回取消订阅函数
    return () => {
      const callbacks = this.subscriptions.get(documentId);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
        if (callbacks.length === 0) {
          this.subscriptions.delete(documentId);
          // 发送取消订阅消息
          this.sendMessage({
            type: 'sync',
            document: documentId,
          });
        }
      }
    };
  }

  /**
   * 应用文档更新
   */
  private applyDocumentUpdate(documentId: string, update: Uint8Array): void {
    const doc = this.documents.get(documentId);
    if (doc) {
      doc.version++;
      // 这里应该使用 YJS 的更新机制
      // 为了简化，我们直接触发变更事件
      this.emit('document_update', {
        documentId,
        update,
        version: doc.version,
      });

      // 通知订阅者
      const callbacks = this.subscriptions.get(documentId);
      if (callbacks) {
        callbacks.forEach(callback => callback(update));
      }
    }
  }

  /**
   * 获取文档更新
   */
  private getDocumentUpdate(documentId: string): Uint8Array {
    const doc = this.documents.get(documentId);
    if (doc) {
      // 这里应该返回 YJS 的更新数据
      // 为了简化，返回空数组
      return new Uint8Array(0);
    }
    return new Uint8Array(0);
  }

  /**
   * 销毁文档
   */
  private destroyDocument(documentId: string): void {
    this.documents.delete(documentId);
    this.subscriptions.delete(documentId);
  }

  /**
   * 发送消息
   */
  private sendMessage(message: YjsMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      if (this.options.debug) {
        console.warn('[YJS Client] Cannot send message: WebSocket is not connected', message);
      }
      return;
    }

    try {
      if (message.update || message.state || message.awareness) {
        // 发送二进制消息
        const buffer = new ArrayBuffer(1 + (message.update?.length || 0) + (message.state?.length || 0) + (message.awareness?.length || 0));
        const view = new Uint8Array(buffer);
        let offset = 0;

        // 消息类型
        view[offset++] = this.getMessageTypeCode(message.type);

        // 更新数据
        if (message.update) {
          view.set(message.update, offset);
          offset += message.update.length;
        }

        // 状态数据
        if (message.state) {
          view.set(message.state, offset);
          offset += message.state.length;
        }

        // 感知数据
        if (message.awareness) {
          view.set(message.awareness, offset);
        }

        this.ws.send(buffer);
      } else {
        // 发送 JSON 消息
        this.ws.send(JSON.stringify(message));
      }

      if (this.options.debug) {
        console.log('[YJS Client] Sent message:', message);
      }
    } catch (error) {
      if (this.options.debug) {
        console.error('[YJS Client] Failed to send message:', error);
      }
      this.emit('send_error', error);
    }
  }

  /**
   * 获取消息类型代码
   */
  private getMessageTypeCode(type: string): number {
    switch (type) {
      case 'sync': return 0;
      case 'update': return 1;
      case 'awareness': return 2;
      case 'ping': return 3;
      case 'pong': return 4;
      default: return 0;
    }
  }

  /**
   * 处理连接打开事件
   */
  private handleOpen(): void {
    if (this.options.debug) {
      console.log('[YJS Client] Connected');
    }

    this.connectionState = 'connected';
    this.isConnecting = false;
    this.reconnectAttempts = 0;

    this.clearTimers();
    this.startHeartbeat();
    this.emit('connected');

    // 重新订阅所有文档
    for (const documentId of this.subscriptions.keys()) {
      this.sendMessage({
        type: 'sync',
        document: documentId,
      });
    }
  }

  /**
   * 处理消息
   */
  private handleMessage(event: MessageEvent): void {
    try {
      if (event.data instanceof ArrayBuffer) {
        // 处理二进制消息
        this.handleBinaryMessage(event.data);
      } else {
        // 处理文本消息
        const message = JSON.parse(event.data);
        this.handleTextMessage(message);
      }
    } catch (error) {
      if (this.options.debug) {
        console.error('[YJS Client] Failed to parse message:', error);
      }
      this.emit('parse_error', error);
    }
  }

  /**
   * 处理二进制消息
   */
  private handleBinaryMessage(data: ArrayBuffer): void {
    const view = new Uint8Array(data);
    if (view.length === 0) return;

    const messageType = view[0];
    const payload = view.slice(1);

    let type: string;
    switch (messageType) {
      case 0: type = 'sync'; break;
      case 1: type = 'update'; break;
      case 2: type = 'awareness'; break;
      case 3: type = 'ping'; break;
      case 4: type = 'pong'; break;
      default: type = 'unknown';
    }

    if (this.options.debug) {
      console.log('[YJS Client] Received binary message:', { type, payload });
    }

    this.emit('message', { type, payload });
  }

  /**
   * 处理文本消息
   */
  private handleTextMessage(message: YjsMessage): void {
    if (this.options.debug) {
      console.log('[YJS Client] Received text message:', message);
    }

    this.emit('message', message);

    switch (message.type) {
      case 'connected':
        this.emit('connected', message);
        break;
      case 'error':
        this.emit('error', new Error(message.document || 'YJS error'));
        break;
      case 'pong':
        this.emit('pong', message);
        break;
      default:
        this.emit('unknown_message', message);
    }
  }

  /**
   * 处理连接关闭事件
   */
  private handleClose(event: CloseEvent): void {
    if (this.options.debug) {
      console.log('[YJS Client] Disconnected:', event.code, event.reason);
    }

    this.connectionState = 'disconnected';
    this.isConnecting = false;
    this.clearTimers();

    this.emit('disconnected', { code: event.code, reason: event.reason });

    // 如果不是主动断开(1000)，尝试重连
    if (event.code !== 1000 && this.reconnectAttempts < this.options.maxReconnectAttempts!) {
      this.scheduleReconnect();
    }
  }

  /**
   * 处理错误
   */
  private handleError(error: Event): void {
    if (this.options.debug) {
      console.error('[YJS Client] Error:', error);
    }

    this.emit('error', error);
  }

  /**
   * 安排重连
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.options.reconnectInterval! * Math.pow(2, this.reconnectAttempts - 1),
      30000 // 最大30秒
    );

    if (this.options.debug) {
      console.log(
        `[YJS Client] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`
      );
    }

    this.emit('reconnecting', { attempt: this.reconnectAttempts, delay });

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connect().catch((error) => {
        if (this.options.debug) {
          console.error('[YJS Client] Reconnect failed:', error);
        }
        this.emit('reconnect_failed', error);
      });
    }, delay);
  }

  /**
   * 开始心跳
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.connectionState === 'connected' && this.ws) {
        try {
          this.sendMessage({ type: 'ping' });
        } catch (error) {
          if (this.options.debug) {
            console.error('[YJS Client] Heartbeat failed:', error);
          }
        }
      }
    }, this.options.heartbeatInterval);
  }

  /**
   * 清除定时器
   */
  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  /**
   * 获取连接状态
   */
  public getConnectionState(): YjsConnectionState {
    return this.connectionState;
  }

  /**
   * 获取重连次数
   */
  public getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  /**
   * 获取活跃文档数量
   */
  public getActiveDocumentCount(): number {
    return this.documents.size;
  }

  /**
   * 获取活跃订阅数量
   */
  public getActiveSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  /**
   * 清理所有资源
   */
  public destroy(): void {
    this.disconnect();

    // 清理所有文档
    for (const doc of this.documents.values()) {
      doc.destroy();
    }
    this.documents.clear();
    this.subscriptions.clear();

    // 移除所有事件监听器
    this.removeAllListeners();
  }
}

