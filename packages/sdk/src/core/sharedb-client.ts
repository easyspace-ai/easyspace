/**
 * ShareDB 客户端实现
 * 提供实时协作和操作同步功能
 */

// 使用浏览器兼容的事件发射器
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
import { WebSocketClient } from './websocket-client.js';
import type { JsonObject } from '../types/index.js';

// ShareDB 相关类型定义
export interface OTOperation {
  p: (string | number)[];
  oi?: any;
  od?: any;
}

export interface RawOperation {
  src: string;
  seq: number;
  v: number;
  c: string; // collection
  d: string; // document id
  op?: OTOperation[];
  create?: {
    type: string;
    data: any;
  };
  del?: boolean;
}

export interface Snapshot {
  id: string;
  v: number;
  type: string | null;
  data: any;
  m?: any;
}

export interface Document {
  id: string;
  collection: string;
  version: number;
  data: any;
  subscribe(callback: (ops: OTOperation[]) => void): () => void;
  submitOp(ops: OTOperation[]): Promise<void>;
  destroy(): void;
}

export interface Subscription {
  unsubscribe(): void;
}

export interface ShareDBConfig {
  debug?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

/**
 * ShareDB 客户端类
 * 管理 ShareDB 连接和文档操作
 */
export class ShareDBClient extends EventEmitter {
  private wsClient: WebSocketClient;
  private documents: Map<string, Document>;
  private subscriptions: Map<string, Subscription>;
  private config: ShareDBConfig;
  private connectionState: 'connecting' | 'connected' | 'disconnected' = 'disconnected';

  constructor(wsClient: WebSocketClient, config: ShareDBConfig = {}) {
    super();
    this.wsClient = wsClient;
    this.config = {
      debug: false,
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      ...config,
    };
    this.documents = new Map();
    this.subscriptions = new Map();

    this.initializeWebSocketHandlers();
  }

  private initializeWebSocketHandlers(): void {
    this.wsClient.on('connected', () => {
      this.connectionState = 'connected';
      this.emit('connected');
      if (this.config.debug) {
        console.log('[ShareDB] Connected to WebSocket');
      }
    });

    this.wsClient.on('disconnected', () => {
      this.connectionState = 'disconnected';
      this.emit('disconnected');
      if (this.config.debug) {
        console.log('[ShareDB] Disconnected from WebSocket');
      }
    });

    this.wsClient.on('message', (message) => {
      this.handleWebSocketMessage(message);
    });

    this.wsClient.on('error', (error) => {
      this.emit('error', error);
      if (this.config.debug) {
        console.error('[ShareDB] WebSocket error:', error);
      }
    });
  }

  private handleWebSocketMessage(message: any): void {
    try {
      // 处理 ShareDB 消息
      if (message.type === 'op') {
        this.handleOperationMessage(message);
      } else if (message.type === 'snapshot') {
        this.handleSnapshotMessage(message);
      } else if (message.type === 'error') {
        this.handleErrorMessage(message);
      }
    } catch (error) {
      if (this.config.debug) {
        console.error('[ShareDB] Error handling message:', error);
      }
      this.emit('error', error);
    }
  }

  private handleOperationMessage(message: any): void {
    const { collection, document, data } = message;
    const docKey = `${collection}:${document}`;
    const doc = this.documents.get(docKey);

    if (doc && data.op) {
      // 触发文档操作事件
      this.emit('operation', {
        collection,
        document,
        operations: data.op,
        source: data.source,
      });
    }
  }

  private handleSnapshotMessage(message: any): void {
    const { collection, document, data } = message;
    const docKey = `${collection}:${document}`;
    const doc = this.documents.get(docKey);

    if (doc) {
      // 更新文档快照
      doc.data = data.data;
      doc.version = data.v;
      this.emit('snapshot', {
        collection,
        document,
        snapshot: data,
      });
    }
  }

  private handleErrorMessage(message: any): void {
    const error = new Error(message.data?.message || 'ShareDB operation failed');
    this.emit('error', error);
  }

  /**
   * 获取文档
   */
  getDocument(collection: string, id: string): Document {
    const docKey = `${collection}:${id}`;

    if (!this.documents.has(docKey)) {
      const doc = this.createDocument(collection, id);
      this.documents.set(docKey, doc);
    }

    return this.documents.get(docKey)!;
  }

  private createDocument(collection: string, id: string): Document {
    const doc: Document = {
      id,
      collection,
      version: 0,
      data: null,
      subscribe: (callback: (ops: OTOperation[]) => void) => {
        return this.subscribeToDocument(collection, id, callback);
      },
      submitOp: async (ops: OTOperation[]) => {
        return this.submitOperation(collection, id, ops);
      },
      destroy: () => {
        this.destroyDocument(collection, id);
      },
    };

    return doc;
  }

  /**
   * 订阅文档变更
   */
  subscribe(collection: string, id: string, callback: (ops: OTOperation[]) => void): Subscription {
    return this.subscribeToDocument(collection, id, callback);
  }

  private subscribeToDocument(
    collection: string,
    id: string,
    callback: (ops: OTOperation[]) => void
  ): Subscription {
    const docKey = `${collection}:${id}`;
    const subKey = `${docKey}:${Date.now()}`;

    // 创建订阅
    const subscription: Subscription = {
      unsubscribe: () => {
        this.subscriptions.delete(subKey);
        this.emit('unsubscribed', { collection, document: id });
      },
    };

    this.subscriptions.set(subKey, subscription);

    // 监听操作事件
    const operationHandler = (event: any) => {
      if (event.collection === collection && event.document === id) {
        callback(event.operations);
      }
    };

    this.on('operation', operationHandler);

    // 发送订阅请求
    this.sendMessage({
      type: 'subscribe',
      collection,
      document: id,
    });

    this.emit('subscribed', { collection, document: id });

    return subscription;
  }

  /**
   * 提交操作
   */
  async submit(collection: string, id: string, ops: OTOperation[]): Promise<void> {
    return this.submitOperation(collection, id, ops);
  }

  private async submitOperation(collection: string, id: string, ops: OTOperation[]): Promise<void> {
    if (this.connectionState !== 'connected') {
      throw new Error('ShareDB client is not connected');
    }

    const operation: RawOperation = {
      src: this.generateSourceId(),
      seq: 1,
      v: 0, // 版本将由服务器管理
      c: collection,
      d: id,
      op: ops,
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Operation timeout'));
      }, 10000);

      const handleResponse = (message: any) => {
        if (message.type === 'op-response' && message.operationId === operation.src) {
          clearTimeout(timeout);
          this.wsClient.off('message', handleResponse);

          if (message.error) {
            reject(new Error(message.error));
          } else {
            resolve();
          }
        }
      };

      this.wsClient.on('message', handleResponse);

      this.sendMessage({
        type: 'submit',
        operation,
      });
    });
  }

  /**
   * 获取快照
   */
  async getSnapshot(collection: string, id: string): Promise<Snapshot> {
    if (this.connectionState !== 'connected') {
      throw new Error('ShareDB client is not connected');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Snapshot request timeout'));
      }, 10000);

      const handleResponse = (message: any) => {
        if (
          message.type === 'snapshot-response' &&
          message.collection === collection &&
          message.document === id
        ) {
          clearTimeout(timeout);
          this.wsClient.off('message', handleResponse);

          if (message.error) {
            reject(new Error(message.error));
          } else {
            resolve(message.snapshot);
          }
        }
      };

      this.wsClient.on('message', handleResponse);

      this.sendMessage({
        type: 'get-snapshot',
        collection,
        document: id,
      });
    });
  }

  /**
   * 查询文档
   */
  async query(
    collection: string,
    query: any,
    options?: any
  ): Promise<{ snapshots: Snapshot[]; extra?: any }> {
    if (this.connectionState !== 'connected') {
      throw new Error('ShareDB client is not connected');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Query request timeout'));
      }, 10000);

      const handleResponse = (message: any) => {
        if (message.type === 'query-response' && message.collection === collection) {
          clearTimeout(timeout);
          this.wsClient.off('message', handleResponse);

          if (message.error) {
            reject(new Error(message.error));
          } else {
            resolve({
              snapshots: message.snapshots || [],
              extra: message.extra,
            });
          }
        }
      };

      this.wsClient.on('message', handleResponse);

      this.sendMessage({
        type: 'query',
        collection,
        query,
        options,
      });
    });
  }

  private sendMessage(message: any): void {
    if (this.connectionState !== 'connected') {
      throw new Error('ShareDB client is not connected');
    }

    this.wsClient.send(message);
  }

  private generateSourceId(): string {
    return `src_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private destroyDocument(collection: string, id: string): void {
    const docKey = `${collection}:${id}`;
    this.documents.delete(docKey);

    // 取消所有相关订阅
    for (const [subKey, subscription] of this.subscriptions.entries()) {
      if (subKey.startsWith(docKey)) {
        subscription.unsubscribe();
      }
    }

    // 发送取消订阅请求
    this.sendMessage({
      type: 'unsubscribe',
      collection,
      document: id,
    });
  }

  /**
   * 获取连接状态
   */
  getConnectionState(): 'connecting' | 'connected' | 'disconnected' {
    return this.connectionState;
  }

  /**
   * 获取活跃文档数量
   */
  getActiveDocumentCount(): number {
    return this.documents.size;
  }

  /**
   * 获取活跃订阅数量
   */
  getActiveSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  /**
   * 清理所有资源
   */
  destroy(): void {
    // 清理所有文档
    for (const [docKey, doc] of this.documents.entries()) {
      doc.destroy();
    }
    this.documents.clear();

    // 清理所有订阅
    for (const subscription of this.subscriptions.values()) {
      subscription.unsubscribe();
    }
    this.subscriptions.clear();

    // 移除所有事件监听器
    this.removeAllListeners();

    this.connectionState = 'disconnected';
  }
}
