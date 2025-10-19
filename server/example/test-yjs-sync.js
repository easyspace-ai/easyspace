#!/usr/bin/env node

/**
 * YJS 同步功能测试脚本
 * 用于验证实时同步是否正常工作
 */

const WebSocket = require('ws');

// 配置
const config = {
  serverUrl: 'ws://localhost:8888/yjs/ws',
  documentId: 'room:test-sync',
  userId1: 'user1',
  userId2: 'user2'
};

console.log('🧪 YJS 同步功能测试');
console.log('========================');
console.log(`服务器: ${config.serverUrl}`);
console.log(`文档ID: ${config.documentId}`);
console.log('');

// 创建两个 WebSocket 连接来模拟多用户
function createConnection(userId) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${config.serverUrl}?document=${config.documentId}&user=${userId}`);
    
    const connection = {
      ws,
      userId,
      connected: false,
      synced: false,
      messages: []
    };

    ws.on('open', () => {
      console.log(`✅ 用户 ${userId} 连接成功`);
      connection.connected = true;
      
      // 发送同步请求
      ws.send(JSON.stringify({
        type: 'sync',
        document: config.documentId,
        user: userId
      }));
      
      resolve(connection);
    });

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());
      connection.messages.push(message);
      
      console.log(`📨 用户 ${userId} 收到消息:`, message.type);
      
      if (message.type === 'connected') {
        console.log(`   - 连接确认: ${message.user_id}`);
      } else if (message.type === 'sync') {
        console.log(`   - 同步消息: state=${message.state ? '有状态' : '无状态'}, update=${message.update ? '有更新' : '无更新'}`);
        if (!message.state && !message.update) {
          connection.synced = true;
        }
      } else if (message.type === 'update') {
        console.log(`   - 更新消息: 大小=${message.update ? JSON.stringify(message.update).length : 0} 字节`);
      }
    });

    ws.on('error', (error) => {
      console.log(`❌ 用户 ${userId} 连接错误:`, error.message);
      reject(error);
    });

    ws.on('close', () => {
      console.log(`🔌 用户 ${userId} 连接关闭`);
      connection.connected = false;
    });
  });
}

// 发送测试更新
function sendTestUpdate(connection, updateData) {
  if (connection.connected && connection.ws.readyState === WebSocket.OPEN) {
    const message = {
      type: 'update',
      document: config.documentId,
      user: connection.userId,
      update: Array.from(new TextEncoder().encode(JSON.stringify(updateData)))
    };
    
    connection.ws.send(JSON.stringify(message));
    console.log(`📤 用户 ${connection.userId} 发送更新:`, updateData);
  }
}

// 主测试函数
async function runSyncTest() {
  try {
    console.log('🔗 创建用户连接...');
    
    // 创建两个用户连接
    const user1 = await createConnection(config.userId1);
    const user2 = await createConnection(config.userId2);
    
    // 等待连接稳定
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('\n📝 开始同步测试...');
    
    // 用户1发送更新
    console.log('\n1️⃣ 用户1发送更新...');
    sendTestUpdate(user1, {
      type: 'text_update',
      content: 'Hello from User 1!',
      timestamp: Date.now()
    });
    
    // 等待更新传播
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 用户2发送更新
    console.log('\n2️⃣ 用户2发送更新...');
    sendTestUpdate(user2, {
      type: 'text_update',
      content: 'Hello from User 2!',
      timestamp: Date.now()
    });
    
    // 等待更新传播
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 用户1再次发送更新
    console.log('\n3️⃣ 用户1再次发送更新...');
    sendTestUpdate(user1, {
      type: 'text_update',
      content: 'Final update from User 1!',
      timestamp: Date.now()
    });
    
    // 等待所有更新处理完成
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n📊 测试结果分析...');
    console.log(`用户1收到消息数: ${user1.messages.length}`);
    console.log(`用户2收到消息数: ${user2.messages.length}`);
    
    // 分析消息类型
    const user1MessageTypes = user1.messages.map(m => m.type);
    const user2MessageTypes = user2.messages.map(m => m.type);
    
    console.log(`用户1消息类型: ${user1MessageTypes.join(', ')}`);
    console.log(`用户2消息类型: ${user2MessageTypes.join(', ')}`);
    
    // 检查是否有更新消息
    const user1Updates = user1.messages.filter(m => m.type === 'update').length;
    const user2Updates = user2.messages.filter(m => m.type === 'update').length;
    
    console.log(`用户1收到更新数: ${user1Updates}`);
    console.log(`用户2收到更新数: ${user2Updates}`);
    
    // 判断测试结果
    if (user1Updates > 0 && user2Updates > 0) {
      console.log('\n✅ 同步测试成功！两个用户都收到了更新消息');
    } else if (user1Updates > 0 || user2Updates > 0) {
      console.log('\n⚠️ 同步测试部分成功！只有一个用户收到了更新消息');
    } else {
      console.log('\n❌ 同步测试失败！没有用户收到更新消息');
    }
    
    // 关闭连接
    user1.ws.close();
    user2.ws.close();
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
}

// 运行测试
runSyncTest().then(() => {
  console.log('\n🏁 测试完成');
  process.exit(0);
}).catch(error => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});
