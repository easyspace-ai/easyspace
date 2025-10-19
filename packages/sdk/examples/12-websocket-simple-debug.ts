/**
 * WebSocket 简单调试测试
 * 专门用于调试服务端发送的原始消息内容
 */
import { initAndLogin, cleanup, log, error, separator } from './common';

async function testWebSocketSimpleDebug() {
  separator('WebSocket 简单调试');

  try {
    // 1. 初始化 SDK
    const { sdk } = await initAndLogin();
    log('✅ SDK 初始化成功');

    // 2. 检查 WebSocket 连接状态
    const wsClient = sdk.getWebSocketClient();
    if (!wsClient) {
      error('❌ WebSocket 客户端未初始化');
      return;
    }

    log('✅ WebSocket 连接状态:', wsClient.getConnectionState());

    // 3. 设置原始消息监听器
    let messageCount = 0;
    const rawMessages: any[] = [];

    // 监听原始 WebSocket 消息
    wsClient.on('message', (message: any) => {
      messageCount++;
      rawMessages.push({
        index: messageCount,
        timestamp: new Date().toISOString(),
        message: message,
        messageString: JSON.stringify(message, null, 2),
      });

      log(`📨 收到消息 #${messageCount}:`, {
        type: message.type,
        collection: message.collection,
        document: message.document,
        hasData: !!message.data,
        dataType: typeof message.data,
        timestamp: message.timestamp,
      });
    });

    // 监听解析错误
    wsClient.on('error', (err: any) => {
      error('❌ WebSocket 错误:', err);
    });

    // 4. 订阅表格
    log('\n4. 订阅表格');
    const tableId = 'tbl_6wDmC8NvlsAYZXcBa2XWQ';
    await wsClient.subscribe('table', tableId);
    log('✅ 已订阅表格:', tableId);

    // 等待订阅确认
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 5. 生成调试报告
    log('\n5. 生成调试报告');
    separator('📊 简单调试报告');

    log('✅ 1. 基本统计:');
    log(`    总消息数: ${messageCount}`);
    log(`    原始消息数组长度: ${rawMessages.length}`);

    if (rawMessages.length > 0) {
      log('\n✅ 2. 消息详情:');
      rawMessages.forEach((msg, index) => {
        log(`\n📨 消息 #${index + 1}:`);
        log(`    时间戳: ${msg.timestamp}`);
        log(`    消息类型: ${msg.message.type || 'unknown'}`);
        log(`    集合: ${msg.message.collection || 'unknown'}`);
        log(`    文档: ${msg.message.document || 'unknown'}`);
        log(`    数据存在: ${!!msg.message.data}`);
        log(`    数据类型: ${typeof msg.message.data}`);

        if (msg.message.data) {
          log(`    数据内容: ${JSON.stringify(msg.message.data, null, 2)}`);
        }

        log(`    完整消息: ${msg.messageString}`);
      });
    } else {
      log('\n⚠️  2. 没有收到任何消息');
    }

    // 6. 登出
    await cleanup();
    log('✅ 登出成功');
  } catch (err) {
    error('❌ 测试失败:', err);
    await cleanup();
  }

  separator('✅ WebSocket 简单调试完成');
}

// 运行测试
testWebSocketSimpleDebug().catch(console.error);
