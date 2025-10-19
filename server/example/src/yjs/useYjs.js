import { useState, useEffect, useRef, useCallback } from 'react';
import * as Y from 'yjs';
import { GoWebSocketProvider } from './GoWebSocketProvider';

/**
 * YJS Hook
 * 提供 YJS 文档和 WebSocket 连接的管理
 */
export function useYjs(roomName, options = {}) {
  const [doc, setDoc] = useState(null);
  const [provider, setProvider] = useState(null);
  const [connected, setConnected] = useState(false);
  const [synced, setSynced] = useState(false);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  
  const providerRef = useRef(null);
  const isProcessingServerUpdate = useRef(false);

  // 初始化 YJS 连接
  useEffect(() => {
    if (!roomName) return;

    console.log('🚀 初始化 YJS 连接，房间:', roomName);
    
    // 创建 WebSocket 提供者
    const newProvider = new GoWebSocketProvider(roomName, options);
    const ydoc = newProvider.getDoc();
    
    providerRef.current = newProvider;
    setProvider(newProvider);
    setDoc(ydoc);
    setUserId(newProvider.getUserId());

    // 监听连接状态
    const handleStatus = (event) => {
      setConnected(event.status === 'connected');
      if (event.status === 'connected') {
        setError(null);
      }
    };

    // 监听同步状态
    const handleSynced = (event) => {
      setSynced(event.synced);
      console.log('✅ YJS 文档已同步');
    };

    // 监听错误
    const handleError = (err) => {
      console.error('YJS 提供者错误:', err);
      setError(err.message || '连接错误');
    };

    // 监听文档更新
    const handleUpdate = (update, origin) => {
      if (origin !== newProvider) {
        // 这是来自服务器的更新
        isProcessingServerUpdate.current = true;
        console.log('📥 收到服务器更新');
      } else {
        // 这是本地更新，发送到服务器
        console.log('📤 发送本地更新到服务器');
        newProvider.sendUpdate(update);
      }
    };

    // 注册事件监听器
    newProvider.on('status', handleStatus);
    newProvider.on('synced', handleSynced);
    newProvider.on('error', handleError);
    ydoc.on('update', handleUpdate);

    // 清理函数
    return () => {
      console.log('🧹 清理 YJS 连接');
      newProvider.off('status', handleStatus);
      newProvider.off('synced', handleSynced);
      newProvider.off('error', handleError);
      ydoc.off('update', handleUpdate);
      newProvider.destroy();
      providerRef.current = null;
    };
  }, [roomName, JSON.stringify(options)]);

  // 重连函数
  const reconnect = useCallback(() => {
    if (providerRef.current) {
      console.log('🔄 手动重连');
      providerRef.current.connect();
    }
  }, []);

  // 获取共享类型
  const getSharedType = useCallback((type, name) => {
    if (!doc) return null;
    
    switch (type) {
      case 'text':
        return doc.getText(name);
      case 'array':
        return doc.getArray(name);
      case 'map':
        return doc.getMap(name);
      default:
        throw new Error(`不支持的共享类型: ${type}`);
    }
  }, [doc]);

  // 发送感知信息
  const sendAwareness = useCallback((awareness) => {
    if (providerRef.current) {
      providerRef.current.sendAwareness(awareness);
    }
  }, []);

  return {
    doc,
    provider,
    connected,
    synced,
    error,
    userId,
    reconnect,
    getSharedType,
    sendAwareness,
    isProcessingServerUpdate: isProcessingServerUpdate.current
  };
}

/**
 * 使用 YJS 文本的 Hook
 */
export function useYjsText(roomName, textName = 'text', options = {}) {
  const { doc, connected, synced, error } = useYjs(roomName, options);
  const [text, setText] = useState('');
  const [textLength, setTextLength] = useState(0);

  useEffect(() => {
    if (!doc) return;

    const yText = doc.getText(textName);
    
    // 设置初始值
    setText(yText.toString());
    setTextLength(yText.length);

    // 监听文本变化
    const handleUpdate = () => {
      setText(yText.toString());
      setTextLength(yText.length);
    };

    yText.observe(handleUpdate);

    return () => {
      yText.unobserve(handleUpdate);
    };
  }, [doc, textName]);

  // 更新文本
  const updateText = useCallback((newText) => {
    if (!doc) return;
    
    const yText = doc.getText(textName);
    yText.delete(0, yText.length);
    yText.insert(0, newText);
  }, [doc, textName]);

  // 插入文本
  const insertText = useCallback((index, text) => {
    if (!doc) return;
    
    const yText = doc.getText(textName);
    yText.insert(index, text);
  }, [doc, textName]);

  // 删除文本
  const deleteText = useCallback((index, length) => {
    if (!doc) return;
    
    const yText = doc.getText(textName);
    yText.delete(index, length);
  }, [doc, textName]);

  return {
    text,
    textLength,
    updateText,
    insertText,
    deleteText,
    connected,
    synced,
    error
  };
}

/**
 * 使用 YJS 数组的 Hook
 */
export function useYjsArray(roomName, arrayName = 'array', options = {}) {
  const { doc, connected, synced, error } = useYjs(roomName, options);
  const [array, setArray] = useState([]);

  useEffect(() => {
    if (!doc) return;

    const yArray = doc.getArray(arrayName);
    
    // 设置初始值
    setArray(yArray.toArray());

    // 监听数组变化
    const handleUpdate = () => {
      setArray(yArray.toArray());
    };

    yArray.observe(handleUpdate);

    return () => {
      yArray.unobserve(handleUpdate);
    };
  }, [doc, arrayName]);

  // 添加项目
  const push = useCallback((...items) => {
    if (!doc) return;
    
    const yArray = doc.getArray(arrayName);
    yArray.push(items);
  }, [doc, arrayName]);

  // 删除项目
  const deleteItem = useCallback((index, length = 1) => {
    if (!doc) return;
    
    const yArray = doc.getArray(arrayName);
    yArray.delete(index, length);
  }, [doc, arrayName]);

  // 插入项目
  const insert = useCallback((index, ...items) => {
    if (!doc) return;
    
    const yArray = doc.getArray(arrayName);
    yArray.insert(index, items);
  }, [doc, arrayName]);

  // 清空数组
  const clear = useCallback(() => {
    if (!doc) return;
    
    const yArray = doc.getArray(arrayName);
    yArray.delete(0, yArray.length);
  }, [doc, arrayName]);

  return {
    array,
    push,
    delete: deleteItem,
    insert,
    clear,
    connected,
    synced,
    error
  };
}

/**
 * 使用 YJS Map 的 Hook
 */
export function useYjsMap(roomName, mapName = 'map', options = {}) {
  const { doc, connected, synced, error } = useYjs(roomName, options);
  const [map, setMap] = useState({});

  useEffect(() => {
    if (!doc) return;

    const yMap = doc.getMap(mapName);
    
    // 设置初始值
    setMap(yMap.toJSON());

    // 监听 Map 变化
    const handleUpdate = () => {
      setMap(yMap.toJSON());
    };

    yMap.observe(handleUpdate);

    return () => {
      yMap.unobserve(handleUpdate);
    };
  }, [doc, mapName]);

  // 设置键值对
  const set = useCallback((key, value) => {
    if (!doc) return;
    
    const yMap = doc.getMap(mapName);
    yMap.set(key, value);
  }, [doc, mapName]);

  // 删除键值对
  const deleteKey = useCallback((key) => {
    if (!doc) return;
    
    const yMap = doc.getMap(mapName);
    yMap.delete(key);
  }, [doc, mapName]);

  // 清空 Map
  const clear = useCallback(() => {
    if (!doc) return;
    
    const yMap = doc.getMap(mapName);
    yMap.clear();
  }, [doc, mapName]);

  return {
    map,
    set,
    delete: deleteKey,
    clear,
    connected,
    synced,
    error
  };
}
