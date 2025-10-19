/**
 * WebSocket 原始消息调试测试
 * 专门用于调试服务端发送的原始消息内容
 */
import { initAndLogin, cleanup, log, error, separator } from './common';

async function testWebSocketRawMessageDebug() {
  separator('WebSocket 原始消息调试');

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

    // 3. 获取现有表信息
    const tableId = 'tbl_6wDmC8NvlsAYZXcBa2XWQ';
    const table = await sdk.tables.getTable(tableId);
    log('✅ 表信息:', { id: table.id, name: table.name });

    const fields = await sdk.tables.getFields(tableId);
    const titleField = fields.find((f) => f.name === '文本');
    const statusField = fields.find((f) => f.name === '单选');

    log('✅ 使用字段:', {
      titleField: titleField?.name,
      statusField: statusField?.name,
    });

    // 4. 设置原始消息监听器
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

    // 5. 订阅表格
    log('\n5. 订阅表格');
    await wsClient.subscribe('table', tableId);
    log('✅ 已订阅表格:', tableId);

    // 等待订阅确认
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 6. 创建测试记录
    log('\n6. 创建测试记录');
    const record = await sdk.tables.createRecord(tableId, {
      [titleField!.id]: '原始消息调试测试记录',
      [statusField!.id]: '选项1',
    });
    log('✅ 记录创建成功:', { id: record.id });

    // 等待 WebSocket 事件
    log('⏳ 等待记录创建的 WebSocket 事件...');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 7. 更新记录
    log('\n7. 更新记录');
    const updatedRecord = await sdk.tables.updateRecord(tableId, record.id, {
      [statusField!.id]: 'doing',
    });
    log('✅ 记录更新成功:', { id: updatedRecord.id, version: updatedRecord.version });

    // 等待 WebSocket 事件
    log('⏳ 等待记录更新的 WebSocket 事件...');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 8. 订阅记录
    log('\n8. 订阅记录');
    await wsClient.subscribe('record', `${tableId}.${record.id}`);
    log('✅ 已订阅记录:', record.id);

    // 等待订阅确认
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 9. 再次更新记录
    log('\n9. 再次更新记录');
    const finalRecord = await sdk.tables.updateRecord(tableId, record.id, {
      [statusField!.id]: 'done',
    });
    log('✅ 记录最终更新成功:', { id: finalRecord.id, version: finalRecord.version });

    // 等待 WebSocket 事件
    log('⏳ 等待最终更新的 WebSocket 事件...');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 10. 生成调试报告
    log('\n10. 生成调试报告');
    separator('📊 原始消息调试报告');

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

    // 11. 清理测试记录
    log('\n11. 清理测试记录');
    await sdk.tables.deleteRecord(tableId, record.id);
    log('✅ 测试记录已删除');

    // 12. 登出
    await cleanup();
    log('✅ 登出成功');
  } catch (err) {
    error('❌ 测试失败:', err);
    await cleanup();
  }

  separator('✅ WebSocket 原始消息调试完成');
}

// 运行测试
testWebSocketRawMessageDebug().catch(console.error);
