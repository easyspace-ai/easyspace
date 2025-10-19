/**
 * WebSocket 详细测试
 * 包含详细的调试信息和状态检查
 */
import { initAndLogin, cleanup, log, error, separator, randomName } from './common';

async function testWebSocketDetailed() {
  separator('WebSocket 详细测试');

  let createdSpaceId: string | null = null;
  let createdBaseId: string | null = null;
  let createdTableId: string | null = null;

  try {
    const { sdk } = await initAndLogin();

    // 1. 检查初始状态
    log('1. 检查初始 WebSocket 状态');
    const initialState = sdk.getWebSocketState();
    log('初始状态:', initialState);

    // 2. 手动连接 WebSocket
    log('\n2. 手动连接 WebSocket');
    try {
      await sdk.connectWebSocket();
      log('WebSocket 连接尝试完成');
    } catch (err) {
      error('WebSocket 连接失败:', err);
    }

    // 3. 检查连接后状态
    log('\n3. 检查连接后状态');
    const connectedState = sdk.getWebSocketState();
    log('连接后状态:', connectedState);

    // 4. 等待连接稳定
    log('\n4. 等待连接稳定...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const finalState = sdk.getWebSocketState();
    log('最终状态:', finalState);

    // 5. 准备测试环境
    log('\n5. 准备测试环境：创建 Space/Base/Table');
    const space = await sdk.createSpace({
      name: randomName('WebSocket详细测试Space'),
    });
    createdSpaceId = space.id;

    const base = await sdk.createBase({
      spaceId: space.id,
      name: randomName('WebSocket详细测试Base'),
    });
    createdBaseId = base.id;

    const table = await sdk.createTable({
      baseId: base.id,
      name: randomName('WebSocket详细测试Table'),
    });
    createdTableId = table.id;

    log('测试环境准备完成', {
      spaceId: space.id,
      baseId: base.id,
      tableId: table.id,
    });

    // 6. 设置详细的事件监听器
    log('\n6. 设置详细的事件监听器');

    let eventCount = 0;
    const eventTypes = new Set<string>();

    // 监听所有 WebSocket 事件
    sdk.onRecordChange((message) => {
      eventCount++;
      eventTypes.add('record_change');
      log(`📝 记录变更事件 #${eventCount}:`, {
        type: message.type,
        collection: message.collection,
        document: message.document,
        data: message.data,
      });
    });

    sdk.onCollaboration((message) => {
      eventCount++;
      eventTypes.add('collaboration');
      log(`🤝 协作事件 #${eventCount}:`, {
        type: message.type,
        data: message.data,
      });
    });

    sdk.onPresenceUpdate((message) => {
      eventCount++;
      eventTypes.add('presence_update');
      log(`👤 在线状态更新 #${eventCount}:`, {
        type: message.type,
        data: message.data,
      });
    });

    sdk.onNotification((message) => {
      eventCount++;
      eventTypes.add('notification');
      log(`🔔 通知事件 #${eventCount}:`, {
        type: message.type,
        data: message.data,
      });
    });

    // 7. 测试表格订阅
    log('\n7. 测试表格订阅');
    sdk.subscribeToTable(table.id);
    log('✅ 已订阅表格:', table.id);

    // 等待订阅生效
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 8. 创建字段
    log('\n8. 创建字段');
    const titleField = await sdk.createField({
      tableId: table.id,
      name: '标题',
      type: 'singleLineText',
      required: true,
    });

    const statusField = await sdk.createField({
      tableId: table.id,
      name: '状态',
      type: 'singleSelect',
      options: {
        choices: [
          { id: 'todo', name: '待办' },
          { id: 'doing', name: '进行中' },
          { id: 'done', name: '已完成' },
        ],
      },
    });

    log('字段创建完成:', {
      titleField: titleField.name,
      statusField: statusField.name,
    });

    // 9. 创建测试记录
    log('\n9. 创建测试记录（应该触发 WebSocket 事件）');
    const record = await sdk.createRecord({
      tableId: table.id,
      data: {
        [titleField.name]: 'WebSocket 详细测试记录',
        [statusField.name]: 'todo',
      },
    });

    log('记录创建成功:', {
      id: record.id,
      data: record.data,
    });

    // 10. 等待 WebSocket 事件
    log('\n10. 等待 WebSocket 事件...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 11. 更新记录
    log('\n11. 更新记录（应该触发 WebSocket 事件）');
    const updatedRecord = await sdk.updateRecord(table.id, record.id, {
      [statusField.name]: 'doing',
    });

    log('记录更新成功:', {
      id: updatedRecord.id,
      version: updatedRecord.version,
      data: updatedRecord.data,
    });

    // 12. 等待 WebSocket 事件
    log('\n12. 等待 WebSocket 事件...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 13. 测试记录订阅
    log('\n13. 测试记录订阅');
    sdk.subscribeToRecord(table.id, record.id);
    log('✅ 已订阅记录:', record.id);

    // 14. 再次更新记录
    log('\n14. 再次更新记录（应该触发 WebSocket 事件）');
    const finalRecord = await sdk.updateRecord(table.id, record.id, {
      [statusField.name]: 'done',
    });

    log('记录最终更新成功:', {
      id: finalRecord.id,
      version: finalRecord.version,
      data: finalRecord.data,
    });

    // 15. 等待 WebSocket 事件
    log('\n15. 等待 WebSocket 事件...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 16. 总结测试结果
    log('\n16. 测试结果总结');
    log(`总共收到 ${eventCount} 个 WebSocket 事件`);
    log('事件类型:', Array.from(eventTypes));

    if (eventCount === 0) {
      log('⚠️  警告: 没有收到任何 WebSocket 事件');
      log('可能的原因:');
      log('  - WebSocket 连接未成功建立');
      log('  - 服务器端 WebSocket 事件未正确发送');
      log('  - 订阅未正确设置');
    } else {
      log('✅ 成功收到 WebSocket 事件');
    }

    // 17. 清理测试数据
    log('\n17. 清理测试数据');
    await sdk.deleteSpace(space.id);
    log('清理完成');

    createdTableId = null;
    createdBaseId = null;
    createdSpaceId = null;

    await cleanup();

    separator('✅ WebSocket 详细测试完成');
  } catch (err) {
    error('WebSocket 详细测试失败', err);

    // 清理创建的资源
    try {
      if (createdTableId) {
        await sdk.deleteTable(createdTableId);
      }
      if (createdBaseId) {
        await sdk.deleteBase(createdBaseId);
      }
      if (createdSpaceId) {
        await sdk.deleteSpace(createdSpaceId);
      }
    } catch (cleanupErr) {
      error('清理测试数据失败', cleanupErr);
    }

    await cleanup();
    throw err;
  }
}

// 运行测试
testWebSocketDetailed().catch((err) => {
  error('测试执行失败:', err);
  process.exit(1);
});
