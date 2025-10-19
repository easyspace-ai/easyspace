/**
 * Base/Table/Field 完整流程测试
 * 测试 Base、Table 和 Field 的创建和管理
 */
import { initAndLogin, cleanup, log, error, separator, randomName } from './common';

async function testBaseTableField() {
  separator('Base/Table/Field 完整流程测试');
  
  let createdSpaceId: string | null = null;
  let createdBaseId: string | null = null;
  let createdTableId: string | null = null;
  
  try {
    const { sdk } = await initAndLogin();
    
    // 1. 创建空间
    log('1. 创建测试空间');
    const space = await sdk.createSpace({
      name: randomName('测试空间'),
      description: '用于测试 Base/Table/Field',
    });
    createdSpaceId = space.id;
    log('创建空间成功', { id: space.id, name: space.name });
    
    // 2. 创建 Base
    log('\n2. 在空间中创建 Base');
    const base = await sdk.createBase({
      spaceId: space.id,
      name: randomName('测试Base'),
      icon: '📊',
    });
    createdBaseId = base.id;
    log('创建 Base 成功', { id: base.id, name: base.name });
    
    // 3. 获取 Base 列表
    log('\n3. 获取 Base 列表');
    const bases = await sdk.listBases({
      spaceId: space.id,
      limit: 10,
    });
    log('获取 Base 列表成功', { count: bases.data.length });
    
    // 4. 创建 Table
    log('\n4. 在 Base 中创建 Table');
    const table = await sdk.createTable({
      baseId: base.id,
      name: randomName('任务表'),
      description: '用于管理任务的表格',
    });
    createdTableId = table.id;
    log('创建 Table 成功', { id: table.id, name: table.name });
    
    // 5. 获取 Table 列表
    log('\n5. 获取 Table 列表');
    const tables = await sdk.listTables({
      baseId: base.id,
      limit: 10,
    });
    log('获取 Table 列表成功', { count: tables.data.length });
    
    // 6. 创建字段 - 文本字段
    log('\n6. 创建文本字段');
    const titleField = await sdk.createField({
      tableId: table.id,
      name: '任务标题',
      type: 'singleLineText',
      required: true,
    });
    log('创建文本字段成功', {
      id: titleField.id,
      name: titleField.name,
      type: titleField.type,
    });
    
    // 7. 创建字段 - 单选字段
    log('\n7. 创建单选字段');
    const statusField = await sdk.createField({
      tableId: table.id,
      name: '状态',
      type: 'singleSelect',
      required: true,
      options: {
        choices: [
          { id: 'todo', name: '待办', color: '#FF6B6B' },
          { id: 'doing', name: '进行中', color: '#4ECDC4' },
          { id: 'done', name: '已完成', color: '#45B7D1' },
        ],
      },
    });
    log('创建单选字段成功', {
      id: statusField.id,
      name: statusField.name,
      type: statusField.type,
    });
    
    // 8. 创建字段 - 数字字段
    log('\n8. 创建数字字段');
    const priorityField = await sdk.createField({
      tableId: table.id,
      name: '优先级',
      type: 'number',
      options: {
        minValue: 1,
        maxValue: 5,
      },
    });
    log('创建数字字段成功', {
      id: priorityField.id,
      name: priorityField.name,
      type: priorityField.type,
    });
    
    // 9. 获取字段列表
    log('\n9. 获取字段列表');
    const fields = await sdk.listFields({
      tableId: table.id,
      limit: 20,
    });
    log('获取字段列表成功', {
      count: fields.data.length,
      fields: fields.data.map(f => ({ name: f.name, type: f.type })),
    });
    
    // 10. 获取表格详情（包含字段）
    log('\n10. 获取表格详情');
    const tableDetail = await sdk.getTable(table.id);
    log('获取表格详情成功', {
      id: tableDetail.id,
      name: tableDetail.name,
      description: tableDetail.description,
    });
    
    // 清理测试数据
    log('\n清理测试数据');
    await sdk.deleteTable(table.id);
    log('删除 Table 成功');
    await sdk.deleteBase(base.id);
    log('删除 Base 成功');
    await sdk.deleteSpace(space.id);
    log('删除 Space 成功');
    
    createdTableId = null;
    createdBaseId = null;
    createdSpaceId = null;
    
    await cleanup();
    
    separator('✅ Base/Table/Field 完整流程测试完成');
    
  } catch (err) {
    error('Base/Table/Field 测试失败', err);
    
    // 清理创建的资源
    try {
      const { sdk } = await initAndLogin();
      if (createdTableId) {
        await sdk.deleteTable(createdTableId);
        log('清理 Table 成功');
      }
      if (createdBaseId) {
        await sdk.deleteBase(createdBaseId);
        log('清理 Base 成功');
      }
      if (createdSpaceId) {
        await sdk.deleteSpace(createdSpaceId);
        log('清理 Space 成功');
      }
    } catch (cleanupErr) {
      error('清理测试数据失败', cleanupErr);
    }
    
    await cleanup();
    throw err;
  }
}

// 运行测试
testBaseTableField()
  .then(() => {
    console.log('\n✅ 所有测试通过');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ 测试失败:', err);
    process.exit(1);
  });

