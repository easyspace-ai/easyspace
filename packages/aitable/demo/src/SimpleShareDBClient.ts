/**
 * 简化的 ShareDB 客户端
 * 专门用于演示，避免复杂的依赖和浏览器兼容性问题
 */

import { WebSocketClient } from '@luckdb/sdk';

// 简化的操作类型
export interface SimpleOperation {
  p: (string | number)[];
  oi?: any;
  od?: any;
}

// 简化的文档接口
export interface SimpleDocument {
  id: string;
  collection: string;
  data: any;
  subscribe(callback: (ops: SimpleOperation[]) => void): () => void;
  submitOp(ops: SimpleOperation[]): Promise<void>;
}

// 简化的 ShareDB 客户端
export class SimpleShareDBClient {
  private wsClient: WebSocketClient;
  private documents: Map<string, SimpleDocument> = new Map();
  private subscriptions: Map<string, () => void> = new Map();
  private connectionState: 'connecting' | 'connected' | 'disconnected' = 'disconnected';

  constructor(wsClient: WebSocketClient) {
    this.wsClient = wsClient;
    this.initializeWebSocketHandlers();
  }

  private initializeWebSocketHandlers(): void {
    this.wsClient.on('connected', () => {
      this.connectionState = 'connected';
      console.log('[SimpleShareDB] 已连接到 WebSocket');
    });

    this.wsClient.on('disconnected', () => {
      this.connectionState = 'disconnected';
      console.log('[SimpleShareDB] 已断开 WebSocket 连接');
    });

    this.wsClient.on('message', (message: any) => {
      this.handleWebSocketMessage(message);
    });

    this.wsClient.on('error', (error: any) => {
      console.error('[SimpleShareDB] WebSocket 错误:', error);
    });
  }

  private handleWebSocketMessage(message: any): void {
    try {
      // 处理 ShareDB 消息
      if (message.type === 'op') {
        this.handleOperationMessage(message);
      } else if (message.type === 'snapshot') {
        this.handleSnapshotMessage(message);
      }
    } catch (error) {
      console.error('[SimpleShareDB] 处理消息错误:', error);
    }
  }

  private handleOperationMessage(message: any): void {
    const { collection, document, data } = message;
    const docKey = `${collection}:${document}`;
    const doc = this.documents.get(docKey);

    if (doc && data.op) {
      // 触发文档操作事件
      console.log('[SimpleShareDB] 收到操作:', { collection, document, ops: data.op });

      // 更新文档数据
      this.applyOperationsToDocument(doc, data.op);
    }
  }

  private handleSnapshotMessage(message: any): void {
    const { collection, document, data } = message;
    const docKey = `${collection}:${document}`;
    const doc = this.documents.get(docKey);

    if (doc) {
      // 更新文档快照
      doc.data = data.data;
      console.log('[SimpleShareDB] 收到快照:', { collection, document, data: data.data });
    }
  }

  private applyOperationsToDocument(doc: SimpleDocument, operations: SimpleOperation[]): void {
    for (const op of operations) {
      if (op.p && op.p.length > 0) {
        // 简化的操作应用逻辑
        let target = doc.data;
        for (let i = 0; i < op.p.length - 1; i++) {
          const key = op.p[i];
          if (!target[key]) {
            target[key] = {};
          }
          target = target[key];
        }

        const lastKey = op.p[op.p.length - 1];
        if (op.oi !== undefined) {
          target[lastKey] = op.oi;
        } else if (op.od !== undefined) {
          delete target[lastKey];
        }
      }
    }
  }

  // 获取文档
  getDocument(collection: string, id: string): SimpleDocument {
    const docKey = `${collection}:${id}`;

    if (!this.documents.has(docKey)) {
      const doc: SimpleDocument = {
        id,
        collection,
        data: {},
        subscribe: (callback: (ops: SimpleOperation[]) => void) => {
          return this.subscribeToDocument(collection, id, callback);
        },
        submitOp: async (ops: SimpleOperation[]) => {
          return this.submitOperation(collection, id, ops);
        },
      };
      this.documents.set(docKey, doc);
    }

    return this.documents.get(docKey)!;
  }

  // 订阅文档变更
  private subscribeToDocument(
    collection: string,
    id: string,
    callback: (ops: SimpleOperation[]) => void
  ): () => void {
    const subKey = `${collection}:${id}:${Date.now()}`;

    // 创建订阅
    const unsubscribe = () => {
      this.subscriptions.delete(subKey);
      console.log('[SimpleShareDB] 取消订阅:', { collection, document: id });
    };

    this.subscriptions.set(subKey, unsubscribe);

    // 发送订阅请求
    this.sendMessage({
      type: 'subscribe',
      collection,
      document: id,
    });

    console.log('[SimpleShareDB] 订阅成功:', { collection, document: id });

    return unsubscribe;
  }

  // 提交操作
  private async submitOperation(
    collection: string,
    id: string,
    ops: SimpleOperation[]
  ): Promise<void> {
    if (this.connectionState !== 'connected') {
      throw new Error('ShareDB 客户端未连接');
    }

    const operation = {
      src: this.generateSourceId(),
      seq: 1,
      v: 0,
      c: collection,
      d: id,
      op: ops,
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('操作超时'));
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

  private sendMessage(message: any): void {
    if (this.connectionState !== 'connected') {
      throw new Error('ShareDB 客户端未连接');
    }

    this.wsClient.send(message);
  }

  private generateSourceId(): string {
    return `src_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // 获取连接状态
  getConnectionState(): 'connecting' | 'connected' | 'disconnected' {
    return this.connectionState;
  }

  // 检查是否可用
  isAvailable(): boolean {
    return this.connectionState === 'connected';
  }

  // 清理资源
  destroy(): void {
    // 清理所有订阅
    for (const unsubscribe of this.subscriptions.values()) {
      unsubscribe();
    }
    this.subscriptions.clear();
    this.documents.clear();
  }
}
