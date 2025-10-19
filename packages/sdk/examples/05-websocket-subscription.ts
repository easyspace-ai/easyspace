/**
 * WebSocket 订阅功能测试
 * 测试表格订阅、记录订阅、视图订阅等功能
 */
import { initAndLogin, cleanup, log, error, separator, randomName } from './common';

async function testWebSocketSubscription() {
  separator('WebSocket 订阅功能测试');

  // 使用用户提供的现有表
  const existingTableId = 'tbl_6wDmC8NvlsAYZXcBa2XWQ';
  const existingBaseId = '7ec1e878-91b9-4c1b-ad86-05cdf801318f';
  const existingSpaceId = 'spc_rtpLk96gJHLeYTv7JJMlo';

  try {
    const { sdk } = await initAndLogin();

    // 检查 WebSocket 连接状态
    log('检查 WebSocket 连接状态');
    const wsState = sdk.getWebSocketState();
    log('WebSocket 状态:', wsState);

    if (wsState === 'disconnected') {
      log('尝试连接 WebSocket...');
      await sdk.connectWebSocket();
      log('WebSocket 连接状态:', sdk.getWebSocketState());
    }

    // 使用现有的表
    log('\n使用现有表进行测试');
    log('表ID:', existingTableId);
    log('BaseID:', existingBaseId);
    log('SpaceID:', existingSpaceId);

    // 获取表信息
    const table = await sdk.getTable(existingTableId);
    log('表信息:', {
      id: table.id,
      name: table.name,
      description: table.description,
    });

    // 获取现有字段
    const fields = await sdk.listFields({ tableId: existingTableId });
    log(
      '表字段:',
      fields.map((f) => ({ id: f.id, name: f.name, type: f.type }))
    );

    // 使用现有字段进行测试
    const titleField = fields.find((f) => f.name === '文本') || fields[0];
    const statusField = fields.find((f) => f.name === '单选') || fields[1];

    log('使用字段进行测试:', {
      titleField: titleField?.name,
      statusField: statusField?.name,
    });

    // 创建测试记录
    const record = await sdk.createRecord({
      tableId: table.id,
      data: {
        [titleField.name]: 'WebSocket 测试记录',
        [statusField.name]: '选项1', // 使用现有选项
      },
    });

    log('测试环境准备完成', {
      spaceId: existingSpaceId,
      baseId: existingBaseId,
      tableId: table.id,
      recordId: record.id,
    });

    // 设置事件监听器
    log('\n设置 WebSocket 事件监听器');

    // 监听记录变更事件
    sdk.onRecordChange((message) => {
      log('📝 收到记录变更事件:', {
        action: message.data.action,
        tableId: message.data.table_id,
        recordId: message.data.record_id,
        changes: message.data.changes,
        timestamp: message.timestamp,
      });
    });

    // 监听协作事件
    sdk.onCollaboration((message) => {
      log('🤝 收到协作事件:', {
        action: message.data.action,
        resourceType: message.data.resource_type,
        resourceId: message.data.resource_id,
        payload: message.data.payload,
        timestamp: message.timestamp,
      });
    });

    // 监听在线状态更新
    sdk.onPresenceUpdate((message) => {
      log('👥 收到在线状态更新:', {
        type: message.type,
        data: message.data,
        timestamp: message.timestamp,
      });
    });

    // 监听通知事件
    sdk.onNotification((message) => {
      log('🔔 收到通知事件:', {
        type: message.type,
        data: message.data,
        timestamp: message.timestamp,
      });
    });

    // 1. 测试表格订阅
    log('\n1. 测试表格订阅');
    sdk.subscribeToTable(table.id);
    log('✅ 已订阅表格:', table.id);

    // 等待一下让订阅生效
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 2. 测试记录订阅
    log('\n2. 测试记录订阅');
    sdk.subscribeToRecord(table.id, record.id);
    log('✅ 已订阅记录:', record.id);

    // 等待一下让订阅生效
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 3. 测试记录更新（应该触发 WebSocket 事件）
    log('\n3. 测试记录更新（触发 WebSocket 事件）');
    log('更新记录状态为 "doing"...');

    const updatedRecord = await sdk.updateRecord(table.id, record.id, {
      [statusField.name]: 'doing',
    });

    log('记录更新成功:', {
      id: updatedRecord.id,
      version: updatedRecord.version,
      data: updatedRecord.data,
    });

    // 等待 WebSocket 事件
    log('等待 WebSocket 事件...');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 4. 测试批量创建记录（应该触发多个 WebSocket 事件）
    log('\n4. 测试批量创建记录（触发多个 WebSocket 事件）');
    const batchRecords = await sdk.bulkCreateRecords(table.id, [
      {
        [titleField.name]: '批量记录 1',
        [statusField.name]: 'todo',
      },
      {
        [titleField.name]: '批量记录 2',
        [statusField.name]: 'doing',
      },
    ]);

    log('批量创建记录成功:', {
      count: batchRecords.length,
      recordIds: batchRecords.map((r) => r.id),
    });

    // 等待 WebSocket 事件
    log('等待批量创建的 WebSocket 事件...');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 5. 测试批量更新记录
    log('\n5. 测试批量更新记录（触发批量 WebSocket 事件）');
    const batchUpdated = await sdk.bulkUpdateRecords(
      table.id,
      batchRecords.map((r) => ({
        id: r.id,
        data: {
          [statusField.name]: 'done',
        },
      }))
    );

    log('批量更新记录成功:', {
      count: batchUpdated.length,
    });

    // 等待 WebSocket 事件
    log('等待批量更新的 WebSocket 事件...');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 6. 测试记录删除（应该触发 WebSocket 事件）
    log('\n6. 测试记录删除（触发 WebSocket 事件）');
    await sdk.deleteRecord(table.id, record.id);
    log('记录删除成功:', record.id);

    // 等待 WebSocket 事件
    log('等待删除的 WebSocket 事件...');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 7. 测试取消订阅
    log('\n7. 测试取消订阅');
    sdk.collaboration.unsubscribeFromTable(table.id);
    sdk.collaboration.unsubscribeFromRecord(table.id, record.id);
    log('✅ 已取消订阅表格和记录');

    // 清理测试记录（保留现有表）
    log('\n清理测试记录');
    await sdk.deleteRecord(table.id, record.id);
    log('测试记录已删除');

    await cleanup();

    separator('✅ WebSocket 订阅功能测试完成');
  } catch (err) {
    error('WebSocket 订阅功能测试失败', err);

    // 清理创建的测试记录（保留现有表）
    try {
      const { sdk } = await initAndLogin();
      // 只清理测试记录，不删除现有表
      log('清理测试记录...');
    } catch (cleanupErr) {
      error('清理测试数据失败', cleanupErr);
    }

    await cleanup();
    throw err;
  }
}

// 运行测试
testWebSocketSubscription()
  .then(() => {
    console.log('\n✅ 所有测试通过');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ 测试失败:', err);
    process.exit(1);
  });
