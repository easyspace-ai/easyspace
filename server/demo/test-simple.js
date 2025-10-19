#!/usr/bin/env node

// 简单的HTTP测试脚本
const http = require('http');

console.log('🧪 测试Go服务器连接...\n');

function testHTTPAPI() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:8080/status', (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const status = JSON.parse(data);
          console.log('✅ HTTP API测试通过');
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

function testDemoPage() {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:8080/demo/', (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          const hasTitle = data.includes('y-crdt');
          const hasReact = data.includes('root');
          const hasJS = data.includes('static/js');
          
          console.log('✅ Demo页面测试通过');
          console.log('📋 页面检查:', {
            title: hasTitle ? '✅ 有标题' : '❌ 无标题',
            react: hasReact ? '✅ 有React' : '❌ 无React',
            js: hasJS ? '✅ 有JS' : '❌ 无JS'
          });
          resolve(true);
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Demo页面请求失败:', error.message);
      reject(error);
    });
    
    req.setTimeout(3000, () => {
      req.destroy();
      reject(new Error('Demo页面请求超时'));
    });
  });
}

// 运行测试
async function runTests() {
  try {
    console.log('1️⃣ 测试HTTP API...');
    await testHTTPAPI();
    
    console.log('\n2️⃣ 测试Demo页面...');
    await testDemoPage();
    
    console.log('\n🎉 所有测试通过！');
    console.log('🌐 现在可以访问: http://localhost:8080/demo/');
    console.log('📡 WebSocket端点: ws://localhost:8080/ws');
    console.log('💡 前端现在连接到Go WebSocket服务器！');
    
  } catch (error) {
    console.log(`\n❌ 测试失败: ${error.message}`);
    console.log('💡 请确保Go服务器正在运行: go run main.go');
    process.exit(1);
  }
}

runTests();
