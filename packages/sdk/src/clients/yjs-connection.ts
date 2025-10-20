/*
  Lightweight Yjs WebSocket connector for browsers.
  - Builds ws URL with documentId, userId and optional token as query params
  - Manages connect/reconnect, heartbeat, basic event handlers
  - Supports sending binary (y-websocket frames) and JSON messages
*/

export type YjsConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected';

export interface YjsConnectionOptions {
  endpoint?: string; // e.g. "/ws/yjs"; default "/ws/yjs"
  documentId: string;
  userId: string;
  token?: string; // optional; appended as query param `token`
  heartbeatIntervalMs?: number; // default 30000
  reconnectIntervalMs?: number; // default 5000
  maxReconnectAttempts?: number; // default 10
  debug?: boolean;
  viewId?: string; // optional view context
  baseUrl?: string; // backend base URL for WebSocket connection
}

export class YjsConnection {
  private ws?: WebSocket;
  private reconnectAttempts = 0;
  private heartbeatTimer?: number;
  private state: YjsConnectionState = 'idle';

  constructor(private readonly options: YjsConnectionOptions) {}

  getState(): YjsConnectionState { return this.state; }

  private log(...args: unknown[]) {
    if (this.options.debug) console.log('[YjsConnection]', ...args);
  }

  private buildUrl(): string {
    const { endpoint = '/ws/yjs', userId, token } = this.options;
    // 拆分 documentId，兼容传入 "tableId/viewId" 的情况；未提供时默认 112358
    const rawDoc = this.options.documentId || '112358';
    let doc = rawDoc;
    let view: string | undefined = this.options.viewId;
    if (rawDoc.includes('/')) {
      const [d, v] = rawDoc.split('/');
      doc = d ?? rawDoc;
      view = view ?? v;
    }
    // 使用配置的后端地址而不是当前页面地址
    const baseUrl = this.options.baseUrl ?? 'http://localhost:8888';
    const wsProtocol = baseUrl.startsWith('https:') ? 'wss:' : 'ws:';
    const wsHost = baseUrl.replace(/^https?:\/\//, '');
    const url = new URL(`${wsProtocol}//${wsHost}${endpoint}`);
    url.searchParams.set('document', doc);
    url.searchParams.set('user', userId);
    if (token) url.searchParams.set('token', token);
    if (view) url.searchParams.set('view', view);
    return url.toString();
  }

  connect(): Promise<void> {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return Promise.resolve();
    }
    this.state = 'connecting';
    const url = this.buildUrl();
    this.log('connecting', url);
    this.ws = new WebSocket(url);

    this.ws.binaryType = 'arraybuffer';

    this.ws.onopen = () => {
      this.state = 'connected';
      this.reconnectAttempts = 0;
      this.log('connected');
      this.startHeartbeat();
    };

    this.ws.onclose = () => {
      this.stopHeartbeat();
      this.state = 'disconnected';
      this.log('disconnected');
      this.scheduleReconnect();
    };

    this.ws.onerror = (e) => {
      this.log('error', e);
    };
    return Promise.resolve();
  }

  disconnect(): void {
    this.stopHeartbeat();
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      this.ws.close();
    }
    this.ws = undefined;
    this.state = 'disconnected';
  }

  private startHeartbeat() {
    const interval = this.options.heartbeatIntervalMs ?? 30000;
    this.stopHeartbeat();
    this.heartbeatTimer = window.setInterval(() => {
      try { this.sendJSON({ type: 'ping' }); } catch { /* noop */ }
    }, interval);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  private scheduleReconnect() {
    const max = this.options.maxReconnectAttempts ?? 10;
    if (this.reconnectAttempts >= max) {
      this.log('max reconnect attempts reached');
      return;
    }
    const delay = this.options.reconnectIntervalMs ?? 5000;
    this.reconnectAttempts += 1;
    setTimeout(() => {
      this.connect().catch(() => {/* swallow */});
    }, delay);
  }

  onMessage(handler: (data: ArrayBuffer | string) => void) {
    if (!this.ws) return;
    this.ws.onmessage = (evt) => {
      handler(evt.data as ArrayBuffer | string);
    };
  }

  sendBinary(data: Uint8Array | ArrayBuffer): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) throw new Error('socket not open');
    const payload = data instanceof Uint8Array ? data : new Uint8Array(data);
    this.ws.send(payload);
  }

  sendJSON(obj: unknown): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) throw new Error('socket not open');
    this.ws.send(JSON.stringify(obj));
  }
}


