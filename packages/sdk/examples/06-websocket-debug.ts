/**
 * WebSocket 调试测试
 * 详细测试 WebSocket 连接和订阅功能
 */
import { initAndLogin, cleanup, log, error, separator, randomName } from './common';

async function testWebSocketDebug() {
  separator('WebSocket 调试测试');

  let createdSpaceId: string | null = null;
  let createdBaseId: string | null = null;
  let createdTableId: string | null = null;

  try {
    const { sdk } = await initAndLogin();

    // 检查 WebSocket 连接状态
    log('检查 WebSocket 连接状态');
    const wsState = sdk.getWebSocketState();
    log('WebSocket 状态:', wsState);

    // 手动连接 WebSocket
    log('\n手动连接 WebSocket...');
    try {
      await sdk.connectWebSocket();
      log('WebSocket 连接尝试完成');
    } catch (err) {
      error('WebSocket 连接失败:', err);
    }

    // 再次检查状态
    const wsStateAfter = sdk.getWebSocketState();
    log('连接后 WebSocket 状态:', wsStateAfter);

    // 等待一下
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 准备测试环境
    log('\n准备测试环境：创建 Space/Base/Table');
    const space = await sdk.createSpace({
      name: randomName('WebSocket调试空间'),
      description: '用于调试 WebSocket 连接',
    });
    createdSpaceId = space.id;

    const base = await sdk.createBase({
      spaceId: space.id,
      name: randomName('WebSocket调试Base'),
    });
    createdBaseId = base.id;

    const table = await sdk.createTable({
      baseId: base.id,
      name: randomName('WebSocket调试表'),
      description: '调试 WebSocket 连接',
    });
    createdTableId = table.id;

    log('测试环境准备完成', {
      spaceId: space.id,
      baseId: base.id,
      tableId: table.id,
    });

    // 设置事件监听器
    log('\n设置 WebSocket 事件监听器');

    let eventCount = 0;

    // 监听记录变更事件
    sdk.onRecordChange((message) => {
      eventCount++;
      log(`📝 收到记录变更事件 #${eventCount}:`, {
        action: message.data.action,
        tableId: message.data.table_id,
        recordId: message.data.record_id,
        changes: message.data.changes,
        timestamp: message.timestamp,
      });
    });

    // 监听协作事件
    sdk.onCollaboration((message) => {
      eventCount++;
      log(`🤝 收到协作事件 #${eventCount}:`, {
        action: message.data.action,
        resourceType: message.data.resource_type,
        resourceId: message.data.resource_id,
        payload: message.data.payload,
        timestamp: message.timestamp,
      });
    });

    // 监听在线状态更新
    sdk.onPresenceUpdate((message) => {
      eventCount++;
      log(`👥 收到在线状态更新 #${eventCount}:`, {
        type: message.type,
        data: message.data,
        timestamp: message.timestamp,
      });
    });

    // 监听通知事件
    sdk.onNotification((message) => {
      eventCount++;
      log(`🔔 收到通知事件 #${eventCount}:`, {
        type: message.type,
        data: message.data,
        timestamp: message.timestamp,
      });
    });

    // 测试表格订阅
    log('\n测试表格订阅');
    sdk.subscribeToTable(table.id);
    log('✅ 已订阅表格:', table.id);

    // 等待一下让订阅生效
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 创建字段
    log('\n创建字段');
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

    // 创建测试记录
    log('\n创建测试记录（应该触发 WebSocket 事件）');
    const record = await sdk.createRecord({
      tableId: table.id,
      data: {
        [titleField.name]: 'WebSocket 调试记录',
        [statusField.name]: 'todo',
      },
    });

    log('记录创建成功:', {
      id: record.id,
      data: record.data,
    });

    // 等待 WebSocket 事件
    log('等待 WebSocket 事件...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    log(`总共收到 ${eventCount} 个 WebSocket 事件`);

    // 清理测试数据
    log('\n清理测试数据');
    await sdk.deleteTable(table.id);
    await sdk.deleteBase(base.id);
    await sdk.deleteSpace(space.id);
    log('清理完成');

    createdTableId = null;
    createdBaseId = null;
    createdSpaceId = null;

    await cleanup();

    separator('✅ WebSocket 调试测试完成');
  } catch (err) {
    error('WebSocket 调试测试失败', err);

    // 清理创建的资源
    try {
      const { sdk } = await initAndLogin();
      if (createdTableId) await sdk.deleteTable(createdTableId);
      if (createdBaseId) await sdk.deleteBase(createdBaseId);
      if (createdSpaceId) await sdk.deleteSpace(createdSpaceId);
    } catch (cleanupErr) {
      error('清理测试数据失败', cleanupErr);
    }

    await cleanup();
    throw err;
  }
}

// 运行测试
testWebSocketDebug()
  .then(() => {
    console.log('\n✅ 所有测试通过');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ 测试失败:', err);
    process.exit(1);
  });
