#!/usr/bin/env node

// 测试Go WebSocket服务器连接
const WebSocket = require('ws');

console.log('🧪 测试Go WebSocket服务器连接...\n');

function testWebSocketConnection() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket('ws://localhost:8080/ws?room=test-room');
    let messageCount = 0;
    const expectedMessages = ['welcome', 'doc_state'];

    ws.on('open', () => {
      console.log('✅ WebSocket连接成功');
    });

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        messageCount++;
        
        console.log(`📨 收到消息 ${messageCount}:`, {
          type: message.type,
          data: message.data
        });

        if (message.type === 'welcome') {
          console.log('   🎉 服务器欢迎消息:', message.data.message);
        } else if (message.type === 'doc_state') {
          console.log('   📊 文档状态:', {
            text: message.data.text ? '有文本内容' : '无文本',
            array: message.data.array ? `数组长度: ${message.data.array.length}` : '无数组',
            map: message.data.map ? `Map键数: ${Object.keys(message.data.map).length}` : '无Map'
          });
        }

        if (messageCount >= expectedMessages.length) {
          ws.close();
          resolve(true);
        }
      } catch (error) {
        console.error('❌ 解析消息失败:', error);
        reject(error);
      }
    });

    ws.on('close', () => {
      console.log('🔌 WebSocket连接已关闭');
    });

    ws.on('error', (error) => {
      console.error('❌ WebSocket错误:', error.message);
      reject(error);
    });

    // 5秒超时
    setTimeout(() => {
      if (messageCount < expectedMessages.length) {
        ws.close();
        reject(new Error('连接超时'));
      }
    }, 5000);
  });
}

function testHTTPAPI() {
  return new Promise((resolve, reject) => {
    const http = require('http');
    
    const req = http.get('http://localhost:8080/status', (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const status = JSON.parse(data);
          console.log('📊 服务器状态:', {
            status: status.status,
            totalRooms: status.total_rooms,
            rooms: Object.keys(status.rooms).length > 0 ? '有活跃房间' : '无活跃房间'
          });
          resolve(true);
        } catch (error) {
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ HTTP请求失败:', error.message);
      reject(error);
    });
    
    req.setTimeout(3000, () => {
      req.destroy();
      reject(new Error('HTTP请求超时'));
    });
  });
}

// 运行测试
async function runTests() {
  try {
    console.log('1️⃣ 测试HTTP API...');
    await testHTTPAPI();
    
    console.log('\n2️⃣ 测试WebSocket连接...');
    await testWebSocketConnection();
    
    console.log('\n🎉 所有测试通过！');
    console.log('🌐 现在可以访问: http://localhost:8080/demo/');
    console.log('📡 WebSocket端点: ws://localhost:8080/ws');
    
  } catch (error) {
    console.log(`\n❌ 测试失败: ${error.message}`);
    console.log('💡 请确保Go服务器正在运行: go run main.go');
    process.exit(1);
  }
}

runTests();
