/**
 * WebSocket 实时协作测试
 * 测试 WebSocket 连接和实时消息推送
 */
import { initAndLogin, cleanup, log, error, separator, delay } from './common';

async function testWebSocket() {
  separator('WebSocket 实时协作测试');
  
  try {
    const { sdk } = await initAndLogin();
    
    // 1. 检查 WebSocket 状态
    log('1. 检查 WebSocket 连接状态');
    const state = sdk.getWebSocketState();
    log('WebSocket 状态', { state });
    
    // 2. 如果未连接，手动连接
    if (state === 'disconnected') {
      log('\n2. 手动连接 WebSocket');
      await sdk.connectWebSocket();
      await delay(1000); // 等待连接建立
      log('WebSocket 连接成功');
    }
    
    // 3. 设置事件监听器
    log('\n3. 设置事件监听器');
    
    sdk.onRecordChange((message) => {
      log('收到记录变更消息', {
        type: message.type,
        data: message.data,
      });
    });
    
    sdk.onCollaboration((message) => {
      log('收到协作消息', {
        type: message.type,
        data: message.data,
      });
    });
    
    sdk.onPresenceUpdate((message) => {
      log('收到在线状态更新', {
        type: message.type,
        data: message.data,
      });
    });
    
    log('事件监听器设置完成');
    
    // 4. 等待一段时间以接收消息
    log('\n4. 等待接收实时消息（10秒）');
    await delay(10000);
    
    // 5. 断开 WebSocket
    log('\n5. 断开 WebSocket 连接');
    sdk.disconnectWebSocket();
    log('WebSocket 已断开');
    
    await cleanup();
    
    separator('✅ WebSocket 实时协作测试完成');
    
  } catch (err) {
    error('WebSocket 实时协作测试失败', err);
    await cleanup();
    throw err;
  }
}

// 运行测试
testWebSocket()
  .then(() => {
    console.log('\n✅ 所有测试通过');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ 测试失败:', err);
    process.exit(1);
  });

