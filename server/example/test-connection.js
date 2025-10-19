#!/usr/bin/env node

/**
 * YJS 服务器连接测试脚本
 * 用于快速测试主服务器的 YJS WebSocket 连接
 */

const WebSocket = require('ws');

// 配置
const config = {
  serverUrl: 'ws://localhost:8888',
  endpoint: '/yjs/ws',
  roomName: 'test-room',
  userId: `test_user_${Date.now()}`,
  timeout: 5000
};

// 测试结果
const results = {
  connection: false,
  sync: false,
  update: false,
  latency: 0,
  errors: []
};

console.log('🔌 YJS 服务器连接测试');
console.log('========================');
console.log(`服务器: ${config.serverUrl}${config.endpoint}`);
console.log(`房间: ${config.roomName}`);
console.log(`用户: ${config.userId}`);
console.log('');

// 创建 WebSocket 连接
const ws = new WebSocket(`${config.serverUrl}${config.endpoint}?document=room:${config.roomName}&user=${config.userId}`);

// 连接超时
const connectionTimeout = setTimeout(() => {
  console.log('❌ 连接超时');
  process.exit(1);
}, config.timeout);

// 连接成功
ws.on('open', () => {
  clearTimeout(connectionTimeout);
  results.connection = true;
  console.log('✅ WebSocket 连接成功');
  
  // 发送同步请求
  const syncMessage = {
    type: 'sync',
    document: `room:${config.roomName}`,
    user: config.userId
  };
  
  console.log('📤 发送同步请求...');
  ws.send(JSON.stringify(syncMessage));
  
  // 发送测试更新
  setTimeout(() => {
    const updateMessage = {
      type: 'update',
      document: `room:${config.roomName}`,
      user: config.userId,
      update: [1, 2, 3, 4, 5] // 模拟更新数据
    };
    
    console.log('📤 发送测试更新...');
    ws.send(JSON.stringify(updateMessage));
  }, 1000);
  
  // 发送感知信息
  setTimeout(() => {
    const awarenessMessage = {
      type: 'awareness',
      document: `room:${config.roomName}`,
      user: config.userId,
      awareness: {
        cursor: { x: 100, y: 200 },
        selection: { start: 0, end: 10 }
      }
    };
    
    console.log('📤 发送感知信息...');
    ws.send(JSON.stringify(awarenessMessage));
  }, 2000);
  
  // 测试完成，关闭连接
  setTimeout(() => {
    console.log('🔌 关闭连接...');
    ws.close();
  }, 3000);
});

// 接收消息
ws.on('message', (data) => {
  try {
    const message = JSON.parse(data.toString());
    console.log('📨 收到消息:', message.type);
    
    switch (message.type) {
      case 'connected':
        console.log('✅ 连接确认');
        break;
      case 'sync':
        console.log('🔄 同步消息');
        results.sync = true;
        break;
      case 'update':
        console.log('📝 更新消息');
        results.update = true;
        break;
      case 'pong':
        console.log('🏓 心跳响应');
        break;
      default:
        console.log('❓ 未知消息类型:', message.type);
    }
  } catch (error) {
    console.log('❌ 解析消息失败:', error.message);
    results.errors.push(`解析消息失败: ${error.message}`);
  }
});

// 连接错误
ws.on('error', (error) => {
  clearTimeout(connectionTimeout);
  console.log('❌ WebSocket 错误:', error.message);
  results.errors.push(`WebSocket 错误: ${error.message}`);
  
  // 显示测试结果
  showResults();
  process.exit(1);
});

// 连接关闭
ws.on('close', (code, reason) => {
  console.log(`🔌 连接关闭: ${code} ${reason}`);
  
  // 显示测试结果
  showResults();
  process.exit(0);
});

// 显示测试结果
function showResults() {
  console.log('');
  console.log('📊 测试结果');
  console.log('============');
  console.log(`连接状态: ${results.connection ? '✅ 成功' : '❌ 失败'}`);
  console.log(`同步功能: ${results.sync ? '✅ 正常' : '❌ 异常'}`);
  console.log(`更新功能: ${results.update ? '✅ 正常' : '❌ 异常'}`);
  
  if (results.errors.length > 0) {
    console.log('❌ 错误信息:');
    results.errors.forEach(error => {
      console.log(`   - ${error}`);
    });
  }
  
  const success = results.connection && results.sync && results.update;
  console.log('');
  console.log(`总体结果: ${success ? '✅ 测试通过' : '❌ 测试失败'}`);
  
  if (success) {
    console.log('🎉 YJS 服务器工作正常！');
  } else {
    console.log('⚠️  YJS 服务器存在问题，请检查：');
    console.log('   1. 主服务器是否正在运行');
    console.log('   2. WebSocket 端点是否正确');
    console.log('   3. 网络连接是否正常');
  }
}

// 处理进程退出
process.on('SIGINT', () => {
  console.log('\n🛑 测试中断');
  if (ws.readyState === WebSocket.OPEN) {
    ws.close();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 测试终止');
  if (ws.readyState === WebSocket.OPEN) {
    ws.close();
  }
  process.exit(0);
});
