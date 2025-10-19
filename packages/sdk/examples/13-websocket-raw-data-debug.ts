/**
 * WebSocket 原始数据调试测试
 * 专门用于捕获服务端发送的原始数据
 */
import { initAndLogin, cleanup, log, error, separator } from './common';

async function testWebSocketRawDataDebug() {
  separator('WebSocket 原始数据调试');

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

    // 3. 直接访问 WebSocket 连接来捕获原始数据
    const ws = (wsClient as any).ws;
    if (!ws) {
      error('❌ WebSocket 连接未找到');
      return;
    }

    let rawDataCount = 0;
    const rawDataMessages: any[] = [];

    // 监听原始数据
    const originalOnMessage = ws.onmessage;
    ws.onmessage = (event: any) => {
      rawDataCount++;
      const rawData = event.data;

      rawDataMessages.push({
        index: rawDataCount,
        timestamp: new Date().toISOString(),
        rawData: rawData,
        rawDataType: typeof rawData,
        rawDataString: String(rawData),
        rawDataLength: rawData ? rawData.length : 0,
      });

      log(`📨 收到原始数据 #${rawDataCount}:`, {
        type: typeof rawData,
        length: rawData ? rawData.length : 0,
        preview: String(rawData).substring(0, 100),
        full: String(rawData),
      });

      // 尝试解析 JSON
      try {
        const parsed = JSON.parse(rawData);
        log(`✅ JSON 解析成功:`, parsed);
      } catch (parseError) {
        log(`❌ JSON 解析失败:`, parseError.message);
        log(`   原始数据: "${rawData}"`);
      }

      // 调用原始处理器
      if (originalOnMessage) {
        originalOnMessage(event);
      }
    };

    // 4. 订阅表格
    log('\n4. 订阅表格');
    const tableId = 'tbl_6wDmC8NvlsAYZXcBa2XWQ';
    await wsClient.subscribe('table', tableId);
    log('✅ 已订阅表格:', tableId);

    // 等待订阅确认和消息
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 5. 生成调试报告
    log('\n5. 生成调试报告');
    separator('📊 原始数据调试报告');

    log('✅ 1. 基本统计:');
    log(`    总原始数据数: ${rawDataCount}`);
    log(`    原始数据数组长度: ${rawDataMessages.length}`);

    if (rawDataMessages.length > 0) {
      log('\n✅ 2. 原始数据详情:');
      rawDataMessages.forEach((msg, index) => {
        log(`\n📨 原始数据 #${index + 1}:`);
        log(`    时间戳: ${msg.timestamp}`);
        log(`    数据类型: ${msg.rawDataType}`);
        log(`    数据长度: ${msg.rawDataLength}`);
        log(`    数据预览: "${msg.rawDataString.substring(0, 200)}"`);
        log(`    完整数据: "${msg.rawDataString}"`);
      });
    } else {
      log('\n⚠️  2. 没有收到任何原始数据');
    }

    // 6. 登出
    await cleanup();
    log('✅ 登出成功');
  } catch (err) {
    error('❌ 测试失败:', err);
    await cleanup();
  }

  separator('✅ WebSocket 原始数据调试完成');
}

// 运行测试
testWebSocketRawDataDebug().catch(console.error);
