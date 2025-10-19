/**
 * WebSocket 事件触发器
 * 用于触发各种 WebSocket 事件，配合监听器使用
 */
import { initAndLogin, cleanup, log, error, separator } from './common';

async function triggerWebSocketEvents() {
  separator('WebSocket 事件触发器');

  // 使用用户提供的现有表
  const existingTableId = 'tbl_6wDmC8NvlsAYZXcBa2XWQ';
  const existingBaseId = '7ec1e878-91b9-4c1b-ad86-05cdf801318f';
  const existingSpaceId = 'spc_rtpLk96gJHLeYTv7JJMlo';

  try {
    const { sdk } = await initAndLogin();

    // 1. 获取现有表信息
    log('1. 获取现有表信息');
    const table = await sdk.getTable(existingTableId);
    log('表信息:', {
      id: table.id,
      name: table.name,
    });

    // 2. 获取现有字段
    const fields = await sdk.listFields({ tableId: existingTableId });
    const titleField = fields.find((f) => f.name === '文本') || fields[0];
    const statusField = fields.find((f) => f.name === '单选') || fields[1];

    log('使用字段:', {
      titleField: titleField?.name,
      statusField: statusField?.name,
    });

    // 3. 订阅表格（确保能收到事件）
    log('\n2. 订阅表格');
    sdk.subscribeToTable(table.id);
    log('✅ 已订阅表格:', table.id);

    // 等待订阅生效
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 4. 创建测试记录
    log('\n3. 创建测试记录');
    const record = await sdk.createRecord({
      tableId: table.id,
      data: {
        [titleField.name]: '实时监听测试记录',
        [statusField.name]: '选项1',
      },
    });

    log('记录创建成功:', {
      id: record.id,
      data: record.data,
    });

    // 等待 WebSocket 事件
    log('等待记录创建的 WebSocket 事件...');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 5. 订阅记录
    log('\n4. 订阅记录');
    sdk.subscribeToRecord(table.id, record.id);
    log('✅ 已订阅记录:', record.id);

    // 等待订阅生效
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 6. 更新记录
    log('\n5. 更新记录');
    const updatedRecord = await sdk.updateRecord(table.id, record.id, {
      [statusField.name]: 'doing',
    });

    log('记录更新成功:', {
      id: updatedRecord.id,
      version: updatedRecord.version,
    });

    // 等待 WebSocket 事件
    log('等待记录更新的 WebSocket 事件...');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 7. 再次更新记录
    log('\n6. 再次更新记录');
    const finalRecord = await sdk.updateRecord(table.id, record.id, {
      [statusField.name]: 'done',
    });

    log('记录最终更新成功:', {
      id: finalRecord.id,
      version: finalRecord.version,
    });

    // 等待 WebSocket 事件
    log('等待最终更新的 WebSocket 事件...');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 8. 批量创建记录
    log('\n7. 批量创建记录');
    const batchRecords = await sdk.bulkCreateRecords(table.id, [
      {
        [titleField.name]: '批量记录1',
        [statusField.name]: '选项1',
      },
      {
        [titleField.name]: '批量记录2',
        [statusField.name]: '选项2',
      },
      {
        [titleField.name]: '批量记录3',
        [statusField.name]: '选项3',
      },
    ]);

    log('批量记录创建成功:', {
      count: batchRecords.length,
      ids: batchRecords.map((r) => r.id),
    });

    // 等待 WebSocket 事件
    log('等待批量创建的 WebSocket 事件...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 9. 批量更新记录
    log('\n8. 批量更新记录');
    const batchUpdates = await sdk.bulkUpdateRecords(table.id, [
      {
        id: batchRecords[0].id,
        data: { [statusField.name]: 'updated1' },
      },
      {
        id: batchRecords[1].id,
        data: { [statusField.name]: 'updated2' },
      },
    ]);

    log('批量记录更新成功:', {
      count: Array.isArray(batchUpdates) ? batchUpdates.length : 'unknown',
      ids: Array.isArray(batchUpdates) ? batchUpdates.map((r) => r.id) : 'unknown',
      response: batchUpdates,
    });

    // 等待 WebSocket 事件
    log('等待批量更新的 WebSocket 事件...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 10. 清理测试记录
    log('\n9. 清理测试记录');
    const allRecordIds = [record.id, ...batchRecords.map((r) => r.id)];

    // 删除单个记录
    await sdk.deleteRecord(table.id, record.id);
    log('单个记录已删除:', record.id);

    // 等待删除 WebSocket 事件
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 批量删除记录
    await sdk.bulkDeleteRecords(
      table.id,
      batchRecords.map((r) => r.id)
    );
    log(
      '批量记录已删除:',
      batchRecords.map((r) => r.id)
    );

    // 等待删除 WebSocket 事件
    log('等待批量删除的 WebSocket 事件...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    log('\n✅ 所有测试操作完成！');
    log('请查看监听器窗口中的 WebSocket 事件');

    await cleanup();

    separator('✅ WebSocket 事件触发完成');
  } catch (err) {
    error('WebSocket 事件触发失败', err);
    await cleanup();
    throw err;
  }
}

// 运行触发器
triggerWebSocketEvents()
  .then(() => {
    console.log('\n✅ 事件触发测试完成');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ 事件触发测试失败:', err);
    process.exit(1);
  });
