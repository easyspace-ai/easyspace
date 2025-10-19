/**
 * 视图管理测试
 * 测试视图的创建、更新、分享等功能
 */
import { initAndLogin, cleanup, log, error, separator, randomName } from './common';

async function testViewManagement() {
  separator('视图管理测试');
  
  let createdSpaceId: string | null = null;
  let createdBaseId: string | null = null;
  let createdTableId: string | null = null;
  
  try {
    const { sdk } = await initAndLogin();
    
    // 准备测试环境
    log('准备测试环境');
    const space = await sdk.createSpace({
      name: randomName('测试空间'),
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
    });
    createdTableId = table.id;
    
    // 创建一些字段
    await sdk.createField({
      tableId: table.id,
      name: '标题',
      type: 'singleLineText',
    });
    
    await sdk.createField({
      tableId: table.id,
      name: '状态',
      type: 'singleSelect',
      options: {
        choices: [
          { id: 'todo', name: '待办' },
          { id: 'done', name: '完成' },
        ],
      },
    });
    
    log('测试环境准备完成');
    
    // 1. 创建网格视图
    log('\n1. 创建网格视图');
    const gridView = await sdk.createView({
      tableId: table.id,
      name: '网格视图',
      type: 'grid',
      description: '默认的网格视图',
    });
    log('创建网格视图成功', {
      id: gridView.id,
      name: gridView.name,
      type: gridView.type,
    });
    
    // 2. 创建看板视图
    log('\n2. 创建看板视图');
    const kanbanView = await sdk.createView({
      tableId: table.id,
      name: '看板视图',
      type: 'kanban',
      description: '按状态分组的看板',
    });
    log('创建看板视图成功', {
      id: kanbanView.id,
      name: kanbanView.name,
      type: kanbanView.type,
    });
    
    // 3. 获取视图列表
    log('\n3. 获取视图列表');
    const views = await sdk.listViews({
      tableId: table.id,
    });
    log('获取视图列表成功', {
      count: views.length,
      views: views.map(v => ({ name: v.name, type: v.type })),
    });
    
    // 4. 获取视图详情
    log('\n4. 获取视图详情');
    const viewDetail = await sdk.getView(gridView.id);
    log('获取视图详情成功', {
      id: viewDetail.id,
      name: viewDetail.name,
      type: viewDetail.type,
    });
    
    // 5. 更新视图
    log('\n5. 更新视图');
    const updatedView = await sdk.updateView(gridView.id, {
      name: '网格视图（已更新）',
      description: '这是更新后的视图',
    });
    log('更新视图成功', {
      id: updatedView.id,
      name: updatedView.name,
      description: updatedView.description,
    });
    
    // 6. 删除视图
    log('\n6. 删除看板视图');
    await sdk.deleteView(kanbanView.id);
    log('删除视图成功', { id: kanbanView.id });
    
    // 清理测试数据
    log('\n清理测试数据');
    await sdk.deleteView(gridView.id);
    await sdk.deleteTable(table.id);
    await sdk.deleteBase(base.id);
    await sdk.deleteSpace(space.id);
    log('清理完成');
    
    createdTableId = null;
    createdBaseId = null;
    createdSpaceId = null;
    
    await cleanup();
    
    separator('✅ 视图管理测试完成');
    
  } catch (err) {
    error('视图管理测试失败', err);
    
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
testViewManagement()
  .then(() => {
    console.log('\n✅ 所有测试通过');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ 测试失败:', err);
    process.exit(1);
  });

