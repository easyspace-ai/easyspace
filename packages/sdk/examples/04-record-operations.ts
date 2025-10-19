/**
 * 记录操作测试
 * 测试记录的 CRUD 和批量操作
 */
import { initAndLogin, cleanup, log, error, separator, randomName } from './common';

async function testRecordOperations() {
  separator('记录操作测试');

  let createdSpaceId: string | null = null;
  let createdBaseId: string | null = null;
  let createdTableId: string | null = null;

  try {
    const { sdk } = await initAndLogin();

    // 准备测试环境
    log('准备测试环境：创建 Space/Base/Table/Fields');
    const space = await sdk.createSpace({
      name: randomName('测试空间'),
      description: '用于测试记录操作',
    });
    createdSpaceId = space.id;

    const base = await sdk.createBase({
      spaceId: space.id,
      name: randomName('测试Base'),
    });
    createdBaseId = base.id;

    const table = await sdk.createTable({
      baseId: base.id,
      name: randomName('任务表'),
      description: '测试记录操作',
    });
    createdTableId = table.id;

    // 创建字段
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

    log('测试环境准备完成', {
      spaceId: space.id,
      baseId: base.id,
      tableId: table.id,
    });

    // 1. 创建记录
    log('\n1. 创建单条记录');
    const record1 = await sdk.createRecord({
      tableId: table.id,
      data: {
        [titleField.name]: '完成项目文档',
        [statusField.name]: 'todo',
      },
    });
    log('创建记录成功', {
      id: record1.id,
      data: record1.data,
    });

    // 2. 批量创建记录
    log('\n2. 批量创建记录');
    const batchRecords = await sdk.bulkCreateRecords(table.id, [
      {
        [titleField.name]: '编写单元测试',
        [statusField.name]: 'doing',
      },
      {
        [titleField.name]: '代码审查',
        [statusField.name]: 'todo',
      },
      {
        [titleField.name]: '修复Bug',
        [statusField.name]: 'done',
      },
    ]);
    log('批量创建记录成功', {
      count: batchRecords.length,
      records: batchRecords.map((r) => ({ id: r.id, title: r.data[titleField.name] })),
    });

    // 3. 获取记录列表
    log('\n3. 获取记录列表');
    const records = await sdk.listRecords({
      tableId: table.id,
      limit: 20,
    });
    log('获取记录列表成功', {
      total: records.total,
      count: records.data.length,
    });

    // 4. 获取单条记录
    log('\n4. 获取单条记录详情');
    const record = await sdk.getRecord(record1.id);
    log('获取记录详情成功', {
      id: record.id,
      data: record.data,
      version: record.version,
    });

    // 5. 更新记录
    log('\n5. 更新单条记录');
    const updatedRecord = await sdk.updateRecord(table.id, record1.id, {
      [statusField.name]: 'doing',
    });
    log('更新记录成功', {
      id: updatedRecord.id,
      data: updatedRecord.data,
      version: updatedRecord.version,
    });

    // 6. 批量更新记录
    log('\n6. 批量更新记录');
    const recordsToUpdate = batchRecords.slice(0, 2);
    const batchUpdated = await sdk.bulkUpdateRecords(
      table.id, // ✅ 添加 tableId 参数
      recordsToUpdate.map((r) => ({
        id: r.id,
        data: {
          [statusField.name]: 'done',
        },
      }))
    );
    log('批量更新记录成功', {
      count: batchUpdated.length,
    });

    // 7. 删除单条记录
    log('\n7. 删除单条记录');
    await sdk.deleteRecord(table.id, record1.id);
    log('删除记录成功', { id: record1.id });

    // 8. 批量删除记录
    log('\n8. 批量删除记录');
    const recordIdsToDelete = batchRecords.map((r) => r.id);
    await sdk.bulkDeleteRecords(table.id, recordIdsToDelete);
    log('批量删除记录成功', { count: recordIdsToDelete.length });

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

    separator('✅ 记录操作测试完成');
  } catch (err) {
    error('记录操作测试失败', err);

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
testRecordOperations()
  .then(() => {
    console.log('\n✅ 所有测试通过');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ 测试失败:', err);
    process.exit(1);
  });
