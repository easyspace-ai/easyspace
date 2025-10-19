import * as Y from 'yjs';

/**
 * Go WebSocket 提供者
 * 用于连接到 Go 服务器的 YJS WebSocket 端点
 */
export class GoWebSocketProvider {
  constructor(roomName, options = {}) {
    this.roomName = roomName;
    this.options = {
      serverUrl: 'ws://localhost:8888',
      endpoint: '/yjs/ws',
      userId: `user_${Math.random().toString(36).substr(2, 9)}`,
      maxReconnectAttempts: 5,
      reconnectDelay: 1000,
      heartbeatInterval: 30000,
      ...options
    };
    
    this.ws = null;
    this.connected = false;
    this.listeners = new Map();
    this.doc = new Y.Doc();
    this.reconnectAttempts = 0;
    this.heartbeatTimer = null;
    this.synced = false;
    
    // 绑定方法
    this.connect = this.connect.bind(this);
    this.handleMessage = this.handleMessage.bind(this);
    this.attemptReconnect = this.attemptReconnect.bind(this);
    
    this.connect();
    
    // 监听文档更新
    this.doc.on('update', (update, origin) => {
      if (origin !== 'remote') {
        // 只发送本地更新，避免循环
        this.sendUpdate(update);
      }
    });
  }

  connect() {
    // 构建连接URL，包含认证token
    const token = localStorage.getItem('token');
    const params = new URLSearchParams({
      document: `room:${this.roomName}`,
      user: this.options.userId
    });
    
    if (token) {
      params.append('token', token);
    }
    
    const url = `${this.options.serverUrl}${this.options.endpoint}?${params.toString()}`;
    console.log('🔗 连接到 YJS 服务器:', url);
    
    this.ws = new WebSocket(url);
    
    this.ws.onopen = () => {
      this.connected = true;
      this.reconnectAttempts = 0;
      this.emit('status', { status: 'connected', userId: this.options.userId });
      console.log('✅ 已连接到 YJS 服务器');
      
      // 开始心跳
      this.startHeartbeat();
      
      // 请求初始同步
      this.requestSync();
    };
    
    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('解析消息失败:', error, event.data);
      }
    };
    
    this.ws.onclose = (event) => {
      this.connected = false;
      this.synced = false;
      this.emit('status', { status: 'disconnected' });
      console.log('❌ 与 YJS 服务器连接断开:', event.code, event.reason);
      
      this.stopHeartbeat();
      this.attemptReconnect();
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket 错误:', error);
      this.emit('error', error);
    };
  }

  handleMessage(message) {
    console.log('📨 收到服务器消息:', message);
    
    switch (message.type) {
      case 'connected':
        console.log('✅ 连接确认:', message);
        this.emit('connected', message);
        break;
        
      case 'sync':
        this.handleSyncMessage(message);
        break;
        
      case 'update':
        this.handleUpdateMessage(message);
        break;
        
      case 'awareness':
        this.handleAwarenessMessage(message);
        break;
        
      case 'pong':
        // 心跳响应
        break;
        
      default:
        console.log('❓ 未知消息类型:', message.type);
    }
  }

  handleSyncMessage(message) {
    console.log('🔄 处理同步消息:', message);
    
    if (message.state) {
      // 收到状态向量，发送我们的状态
      const stateVector = Y.encodeStateVector(this.doc);
      this.sendMessage({
        type: 'sync',
        document: `room:${this.roomName}`,
        user: this.options.userId,
        state: stateVector
      });
    } else if (message.update) {
      // 收到更新，应用到本地文档
      try {
        Y.applyUpdate(this.doc, new Uint8Array(message.update), 'remote');
        this.emit('update', { type: 'apply', update: message.update });
      } catch (error) {
        console.error('应用更新失败:', error);
      }
    }
    
    if (!this.synced) {
      this.synced = true;
      this.emit('synced', { synced: true });
    }
  }

  handleUpdateMessage(message) {
    console.log('📝 处理更新消息:', message);
    
    if (message.update) {
      try {
        Y.applyUpdate(this.doc, new Uint8Array(message.update), 'remote');
        this.emit('update', { type: 'apply', update: message.update });
      } catch (error) {
        console.error('应用更新失败:', error);
      }
    }
  }

  handleAwarenessMessage(message) {
    console.log('👁️ 处理感知消息:', message);
    this.emit('awareness', message);
  }

  requestSync() {
    this.sendMessage({
      type: 'sync',
      document: `room:${this.roomName}`,
      user: this.options.userId
    });
  }

  sendMessage(message) {
    if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('发送消息失败:', error);
      }
    } else {
      console.warn('WebSocket 未连接，无法发送消息');
    }
  }

  sendUpdate(update) {
    this.sendMessage({
      type: 'update',
      document: `room:${this.roomName}`,
      user: this.options.userId,
      update: Array.from(update)
    });
  }

  sendAwareness(awareness) {
    this.sendMessage({
      type: 'awareness',
      document: `room:${this.roomName}`,
      user: this.options.userId,
      awareness: awareness
    });
  }

  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (this.connected) {
        this.sendMessage({ type: 'ping' });
      }
    }, this.options.heartbeatInterval);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.options.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.options.reconnectDelay * this.reconnectAttempts;
      console.log(`🔄 尝试重连 (${this.reconnectAttempts}/${this.options.maxReconnectAttempts})，${delay}ms 后重试...`);
      
      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.log('❌ 达到最大重连次数，停止重连');
      this.emit('error', new Error('连接失败，已达到最大重连次数'));
    }
  }

  // 事件系统
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('事件回调错误:', error);
        }
      });
    }
  }

  // 获取文档
  getDoc() {
    return this.doc;
  }

  // 获取连接状态
  isConnected() {
    return this.connected;
  }

  // 获取同步状态
  isSynced() {
    return this.synced;
  }

  // 获取用户ID
  getUserId() {
    return this.options.userId;
  }

  // 销毁连接
  destroy() {
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.connected = false;
    this.synced = false;
    this.listeners.clear();
    
    if (this.doc) {
      this.doc.destroy();
    }
  }
}
