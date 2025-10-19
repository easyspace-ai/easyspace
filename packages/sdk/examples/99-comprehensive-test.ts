/**
 * 完整的端到端集成测试
 * 涵盖所有核心功能，自动清理测试数据
 */
import { initAndLogin, cleanup, log, error, separator, randomName, info } from './common';

async function comprehensiveTest() {
  separator('LuckDB SDK 完整集成测试');
  
  const createdResources: {
    spaces: string[];
    bases: string[];
    tables: string[];
  } = {
    spaces: [],
    bases: [],
    tables: [],
  };
  
  try {
    const { sdk, user } = await initAndLogin();
    info('测试用户', { id: user.id, email: user.email, name: user.name });
    
    // ========== 阶段 1: 空间管理 ==========
    separator('阶段 1: 空间管理');
    
    const space = await sdk.createSpace({
      name: randomName('测试空间'),
      description: '完整集成测试空间',
    });
    createdResources.spaces.push(space.id);
    log('创建空间', { id: space.id, name: space.name });
    
    const spaces = await sdk.listSpaces();
    log('获取空间列表', { count: spaces.length });
    
    // ========== 阶段 2: Base 管理 ==========
    separator('阶段 2: Base 管理');
    
    const base = await sdk.createBase({
      spaceId: space.id,
      name: randomName('项目管理Base'),
      icon: '📊',
    });
    createdResources.bases.push(base.id);
    log('创建 Base', { id: base.id, name: base.name });
    
    const bases = await sdk.listBases({ spaceId: space.id });
    log('获取 Base 列表', { count: bases.length });
    
    // ========== 阶段 3: Table 和 Field 管理 ==========
    separator('阶段 3: Table 和 Field 管理');
    
    const table = await sdk.createTable({
      baseId: base.id,
      name: randomName('任务表'),
      description: '项目任务管理',
    });
    createdResources.tables.push(table.id);
    log('创建 Table', { id: table.id, name: table.name });
    
    // 创建多个字段
    const titleField = await sdk.createField({
      tableId: table.id,
      name: '任务标题',
      type: 'singleLineText',
      required: true,
    });
    log('创建字段：任务标题', { id: titleField.id });
    
    const descField = await sdk.createField({
      tableId: table.id,
      name: '描述',
      type: 'longText',
    });
    log('创建字段：描述', { id: descField.id });
    
    const statusField = await sdk.createField({
      tableId: table.id,
      name: '状态',
      type: 'singleSelect',
      options: {
        choices: [
          { id: 'todo', name: '待办', color: '#FF6B6B' },
          { id: 'doing', name: '进行中', color: '#4ECDC4' },
          { id: 'done', name: '已完成', color: '#45B7D1' },
        ],
      },
    });
    log('创建字段：状态', { id: statusField.id });
    
    const priorityField = await sdk.createField({
      tableId: table.id,
      name: '优先级',
      type: 'number',
      options: {
        minValue: 1,
        maxValue: 5,
      },
    });
    log('创建字段：优先级', { id: priorityField.id });
    
    const fields = await sdk.listFields({ tableId: table.id });
    log('获取字段列表', { count: fields.length });
    
    // ========== 阶段 4: 记录管理 ==========
    separator('阶段 4: 记录管理');
    
    // 创建单条记录
    const record1 = await sdk.createRecord({
      tableId: table.id,
      data: {
        [titleField.name]: '完成 SDK 集成测试',
        [descField.name]: '确保所有功能正常工作',
        [statusField.name]: 'doing',
        [priorityField.name]: 5,
      },
    });
    log('创建记录 1', { id: record1.id });
    
    // 批量创建记录
    const batchRecords = await sdk.bulkCreateRecords(table.id, [
      {
        [titleField.name]: '编写测试文档',
        [statusField.name]: 'todo',
        [priorityField.name]: 3,
      },
      {
        [titleField.name]: '代码审查',
        [statusField.name]: 'todo',
        [priorityField.name]: 4,
      },
      {
        [titleField.name]: '修复已知问题',
        [statusField.name]: 'done',
        [priorityField.name]: 2,
      },
    ]);
    log('批量创建记录', { count: batchRecords.length });
    
    // 查询记录列表
    const records = await sdk.listRecords({
      tableId: table.id,
      limit: 20,
    });
    log('获取记录列表', { total: records.total, count: records.data.length });
    
    // 更新记录
    const updatedRecord = await sdk.updateRecord(table.id, record1.id, {
      [statusField.name]: 'done',
    });
    log('更新记录', { id: updatedRecord.id, version: updatedRecord.version });
    
    // ========== 阶段 5: 视图管理 ==========
    separator('阶段 5: 视图管理');
    
    const gridView = await sdk.createView({
      tableId: table.id,
      name: '全部任务',
      type: 'grid',
      description: '显示所有任务',
    });
    log('创建网格视图', { id: gridView.id, name: gridView.name });
    
    const kanbanView = await sdk.createView({
      tableId: table.id,
      name: '任务看板',
      type: 'kanban',
      description: '按状态分组',
    });
    log('创建看板视图', { id: kanbanView.id, name: kanbanView.name });
    
    const views = await sdk.listViews({ tableId: table.id });
    log('获取视图列表', { count: views.length });
    
    // ========== 清理测试数据 ==========
    separator('清理测试数据');
    
    info('开始清理所有测试数据');
    
    // 清理顺序：View -> Record -> Field -> Table -> Base -> Space
    for (const viewId of [gridView.id, kanbanView.id]) {
      await sdk.deleteView(viewId);
      log('删除视图', { id: viewId });
    }
    
    for (const recordId of [record1.id, ...batchRecords.map(r => r.id)]) {
      await sdk.deleteRecord(table.id, recordId);
    }
    log('删除所有记录');
    
    for (const tableId of createdResources.tables) {
      await sdk.deleteTable(tableId);
      log('删除 Table', { id: tableId });
    }
    
    for (const baseId of createdResources.bases) {
      await sdk.deleteBase(baseId);
      log('删除 Base', { id: baseId });
    }
    
    for (const spaceId of createdResources.spaces) {
      await sdk.deleteSpace(spaceId);
      log('删除 Space', { id: spaceId });
    }
    
    info('测试数据清理完成');
    
    await cleanup();
    
    separator('✅ 完整集成测试通过');
    
  } catch (err) {
    error('完整集成测试失败', err);
    
    // 尝试清理已创建的资源
    try {
      info('尝试清理测试数据');
      const { sdk } = await initAndLogin();
      
      for (const tableId of createdResources.tables) {
        try {
          await sdk.deleteTable(tableId);
        } catch (e) {
          // 忽略删除错误
        }
      }
      
      for (const baseId of createdResources.bases) {
        try {
          await sdk.deleteBase(baseId);
        } catch (e) {
          // 忽略删除错误
        }
      }
      
      for (const spaceId of createdResources.spaces) {
        try {
          await sdk.deleteSpace(spaceId);
        } catch (e) {
          // 忽略删除错误
        }
      }
      
      log('测试数据清理完成');
    } catch (cleanupErr) {
      error('清理测试数据失败', cleanupErr);
    }
    
    await cleanup();
    throw err;
  }
}

// 运行测试
comprehensiveTest()
  .then(() => {
    console.log('\n🎉 所有测试通过！SDK 功能正常！');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n💥 测试失败:', err.message || err);
    process.exit(1);
  });

