/**
 * YJS 客户端实现
 * 基于官方 yjs 和 y-websocket 提供完整的 CRDT 同步功能
 */

import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { Awareness } from 'y-protocols/awareness';
import type { LuckDBConfig } from '../types/index.js';

export interface YjsClientOptions {
  debug?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

// YJS 相关类型定义
export interface YjsDocument {
  id: string;
  data: any;
  subscribe(callback: (ops: any[]) => void): () => void;
  submitOp(ops: any[]): Promise<void>;
  destroy(): void;
}

export interface YjsSnapshot {
  id: string;
  v: number;
  type: string | null;
  data: any;
  m?: any;
}

export interface YjsOperation {
  p: (string | number)[];
  oi?: any;
  od?: any;
  li?: any;
  ld?: any;
}

/**
 * YJS 连接状态
 */
export type YjsConnectionState = 'connecting' | 'connected' | 'disconnected';

/**
 * YJS 客户端类
 * 基于官方 yjs 和 y-websocket 管理文档和连接
 */
export class YjsClient {
  private config: LuckDBConfig;
  private options: YjsClientOptions;
  private connectionState: YjsConnectionState = 'disconnected';
  private documents: Map<string, Y.Doc> = new Map();
  private providers: Map<string, WebsocketProvider> = new Map();
  private eventListeners: Map<string, ((...args: unknown[]) => void)[]> = new Map();
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | undefined;
  private isConnecting = false;

  constructor(config: LuckDBConfig, options: YjsClientOptions = {}) {
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
   * 事件监听器管理
   */
  on(event: string, listener: (...args: unknown[]) => void): this {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
    return this;
  }

  off(event: string, listener: (...args: unknown[]) => void): this {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
    return this;
  }

  emit(event: string, ...args: unknown[]): boolean {
    const listeners = this.eventListeners.get(event);
    if (listeners && listeners.length > 0) {
      listeners.forEach((listener) => listener(...args));
      return true;
    }
    return false;
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this.eventListeners.delete(event);
    } else {
      this.eventListeners.clear();
    }
    return this;
  }

  /**
   * 连接 YJS WebSocket
   */
  public connect(documentId?: string): Promise<void> {
    if (this.isConnecting || this.connectionState === 'connected') {
      return Promise.resolve();
    }

    if (!this.config.accessToken) {
      if (this.options.debug) {
        console.log('[YJS Client] Cannot connect: no access token');
      }
      return Promise.resolve();
    }

    this.isConnecting = true;
    this.connectionState = 'connecting';

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
          const tokenParts = this.config.accessToken.split('.');
          if (tokenParts.length >= 2) {
            const payload = JSON.parse(atob(tokenParts[1] || ''));
            userId = payload.user_id ?? '';
          }
        }
      } catch (e) {
        console.warn('[YJS Client] Failed to parse user_id from token:', e);
      }

      // YJS WebSocket 端点（支持 "tableId/viewId"），避免在 url 含查询参数时再被 WebsocketProvider 追加 room 造成 query 被串接
      const raw = documentId ?? 'default';
      const [docId, maybeView] = raw.split('/');
      const finalDocId = docId ?? raw;
      const base = `${wsUrl}/yjs/ws`;
      // 将查询参数放进"roomName"后面，这样最终地址为 /yjs/ws/<room>?token=...&document=...
      const roomWithQuery = `${encodeURIComponent(finalDocId)}?token=${this.config.accessToken}&user=${encodeURIComponent(userId)}&document=${encodeURIComponent(finalDocId)}${maybeView ? `&view=${encodeURIComponent(maybeView)}` : ''}`;

      if (this.options.debug) {
        console.log('[YJS Client] Connecting to:', `${base}/${roomWithQuery}`);
      }

      // 创建 Y.Doc 实例
      const doc = new Y.Doc();
      this.documents.set(finalDocId, doc);

      // 创建 WebSocket 提供者
      const provider = new WebsocketProvider(base, roomWithQuery, doc, {
        awareness: new Awareness(doc),
        connect: true,
        resyncInterval: 5000,
        maxBackoffTime: 2500,
      });

      this.providers.set(finalDocId, provider);

      // 监听连接状态
      provider.on('status', (event: { status: string }) => {
        if (this.options.debug) {
          console.log('[YJS Client] Connection status:', event.status);
        }

        if (event.status === 'connected') {
          this.connectionState = 'connected';
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.emit('connected', { documentId: docId });
        } else if (event.status === 'disconnected') {
          this.connectionState = 'disconnected';
          this.isConnecting = false;
          this.emit('disconnected', { documentId: docId });
        }
      });

      // 监听文档更新
      doc.on('update', (update: Uint8Array, origin: any) => {
        if (this.options.debug) {
          console.log('[YJS Client] Document updated:', { docId, origin });
        }
        this.emit('update', { documentId: docId, update, origin });
      });

      // 监听感知更新
      provider.awareness.on('change', () => {
        if (this.options.debug) {
          console.log('[YJS Client] Awareness changed');
        }
        this.emit('awareness', { documentId: docId, awareness: provider.awareness });
      });

      this.connectionState = 'connected';
      this.isConnecting = false;

      if (this.options.debug) {
        console.log('[YJS Client] Connected successfully');
      }

      return Promise.resolve();

    } catch (error) {
      this.connectionState = 'disconnected';
      this.isConnecting = false;
      this.emit('error', error);
      return Promise.reject(error);
    }
  }

  /**
   * 断开连接
   */
  public disconnect(): void {
    this.clearTimers();

    for (const [docId, provider] of this.providers.entries()) {
      provider.destroy();
    }
    this.providers.clear();

    for (const [docId, doc] of this.documents.entries()) {
      doc.destroy();
    }
    this.documents.clear();

    this.connectionState = 'disconnected';
    this.isConnecting = false;
    this.reconnectAttempts = 0;
  }

  /**
   * 获取文档
   */
  public getDocument(documentId: string): Y.Doc | undefined {
    return this.documents.get(documentId);
  }

  /**
   * 获取（或创建）Y.Map
   */
  public getMap(documentId: string, name: string): Y.Map<any> {
    let doc = this.documents.get(documentId);
    if (!doc) {
      doc = this.createDocument(documentId);
    }
    return doc.getMap(name) as Y.Map<any>;
  }

  /**
   * 获取（或创建）Y.Array
   */
  public getArray(documentId: string, name: string): Y.Array<any> {
    let doc = this.documents.get(documentId);
    if (!doc) {
      doc = this.createDocument(documentId);
    }
    return doc.getArray(name) as Y.Array<any>;
  }

  /**
   * 创建文档
   */
  public createDocument(documentId: string): Y.Doc {
    if (this.documents.has(documentId)) {
      return this.documents.get(documentId)!;
    }

    const doc = new Y.Doc();
    this.documents.set(documentId, doc);
    return doc;
  }

  /**
   * 获取连接状态
   */
  public getConnectionState(): YjsConnectionState {
    return this.connectionState;
  }

  /**
   * 获取活跃文档数量
   */
  public getActiveDocumentCount(): number {
    return this.documents.size;
  }

  /**
   * 获取活跃提供者数量
   */
  public getActiveProviderCount(): number {
    return this.providers.size;
  }

  /**
   * 清理所有资源
   */
  public destroy(): void {
    this.disconnect();
    this.removeAllListeners();
  }

  /**
   * 清除定时器
   */
  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
  }
}