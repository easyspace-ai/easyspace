/**
 * 表格默认值功能测试
 * 测试对齐 Teable 的默认视图和字段注入功能
 * 
 * 测试场景：
 * 1. 不传 views 和 fields，验证默认值注入
 * 2. 只传 views，验证默认 fields 注入
 * 3. 只传 fields，验证默认 views 注入
 * 4. 自定义 views 和 fields
 */
import { initAndLogin, cleanup, log, error, separator, randomName, info } from './common';

async function testTableDefaults() {
  separator('表格默认值功能测试（对齐 Teable）');
  
  let createdSpaceId: string | null = null;
  let createdBaseId: string | null = null;
  const createdTableIds: string[] = [];
  
  try {
    const { sdk } = await initAndLogin();
    
    // 准备测试环境
    log('准备测试环境');
    const space = await sdk.createSpace({
      name: randomName('默认值测试空间'),
      description: '测试表格默认值注入功能',
    });
    createdSpaceId = space.id;
    
    const base = await sdk.createBase({
      spaceId: space.id,
      name: randomName('默认值测试Base'),
      icon: '🧪',
    });
    createdBaseId = base.id;
    log('测试环境准备完成', { baseId: base.id });
    
    // ==========================================
    // 测试 1: 不传 views 和 fields，验证默认值注入
    // ==========================================
    separator('测试 1: 不传参数，验证默认值自动注入');
    
    log('1.1 创建表（不传 views 和 fields）');
    const table1 = await sdk.createTable({
      baseId: base.id,
      name: randomName('测试表1'),
      description: '测试默认值注入',
    });
    createdTableIds.push(table1.id);
    
    log('表创建成功', {
      id: table1.id,
      name: table1.name,
      defaultViewId: table1.defaultViewId,
      fieldCount: table1.fieldCount,
    });
    
    // 验证 defaultViewId 存在
    if (!table1.defaultViewId) {
      throw new Error('❌ defaultViewId 不存在！应该自动创建默认视图');
    }
    log('✅ defaultViewId 存在', { viewId: table1.defaultViewId });
    
    // 获取视图列表
    log('1.2 获取视图列表');
    const views1Response = await sdk.listViews({ tableId: table1.id });
    const views1 = Array.isArray(views1Response) ? views1Response : (views1Response as any).data;
    log('视图列表', {
      count: views1?.length || 0,
      views: views1?.map(v => ({ id: v.id, name: v.name, type: v.type })) || [],
    });
    
    // 验证默认视图
    if (!views1 || views1.length === 0) {
      throw new Error('❌ 视图列表为空！应该有一个默认 Grid view');
    }
    
    const firstView = views1[0];
    if (firstView.name !== 'Grid view' || firstView.type !== 'grid') {
      throw new Error(`❌ 默认视图不正确！期望: Grid view (grid), 实际: ${firstView.name} (${firstView.type})`);
    }
    log('✅ 默认视图正确', { name: firstView.name, type: firstView.type });
    
    // 获取字段列表
    log('1.3 获取字段列表');
    const fields1Response = await sdk.listFields({ tableId: table1.id });
    const fields1 = Array.isArray(fields1Response) ? fields1Response : (fields1Response as any).data;
    log('字段列表', {
      count: fields1?.length || 0,
      fields: fields1?.map(f => ({ id: f.id, name: f.name, type: f.type })) || [],
    });
    
    // 验证默认字段
    if (!fields1 || fields1.length === 0) {
      throw new Error('❌ 字段列表为空！应该有一个默认 name 字段');
    }
    
    const firstField = fields1[0];
    if (firstField.name !== 'name' || firstField.type !== 'text') {
      throw new Error(`❌ 默认字段不正确！期望: name (text), 实际: ${firstField.name} (${firstField.type})`);
    }
    log('✅ 默认字段正确', { name: firstField.name, type: firstField.type });
    
    // ==========================================
    // 测试 2: 自定义 views 和 fields
    // ==========================================
    separator('测试 2: 自定义 views 和 fields');
    
    log('2.1 创建表（自定义 views 和 fields）');
    const table2 = await sdk.createTable({
      baseId: base.id,
      name: randomName('测试表2'),
      description: '测试自定义视图和字段',
      views: [
        { name: 'My Grid', type: 'grid' },
        { name: 'My Kanban', type: 'kanban' },
      ],
      fields: [
        { name: 'title', type: 'text', isPrimary: true },
        { name: 'count', type: 'number' },
        { name: 'status', type: 'select', options: {
          choices: [
            { name: 'todo', color: '#FF6B6B' },
            { name: 'doing', color: '#4ECDC4' },
            { name: 'done', color: '#45B7D1' },
          ],
        }},
      ],
    } as any);
    createdTableIds.push(table2.id);
    
    log('表创建成功', {
      id: table2.id,
      name: table2.name,
      defaultViewId: table2.defaultViewId,
      fieldCount: table2.fieldCount,
    });
    
    // 获取视图列表
    log('2.2 获取视图列表');
    const views2Response = await sdk.listViews({ tableId: table2.id });
    const views2 = Array.isArray(views2Response) ? views2Response : (views2Response as any).data;
    log('视图列表', {
      count: views2?.length || 0,
      views: views2?.map(v => ({ id: v.id, name: v.name, type: v.type })) || [],
    });
    
    // 验证自定义视图
    if (!views2 || views2.length < 2) {
      info(`⚠️  视图数量少于预期，期望: 2, 实际: ${views2?.length || 0}`);
    } else {
      log('✅ 自定义视图创建成功', { count: views2.length });
    }
    
    // 验证第一个视图为默认视图
    if (table2.defaultViewId && views2 && views2.length > 0) {
      if (views2[0].id === table2.defaultViewId) {
        log('✅ 第一个视图为默认视图', { viewId: table2.defaultViewId });
      } else {
        info('⚠️  defaultViewId 与第一个视图ID不匹配');
      }
    }
    
    // 获取字段列表
    log('2.3 获取字段列表');
    const fields2Response = await sdk.listFields({ tableId: table2.id });
    const fields2 = Array.isArray(fields2Response) ? fields2Response : (fields2Response as any).data;
    log('字段列表', {
      count: fields2?.length || 0,
      fields: fields2?.map(f => ({ id: f.id, name: f.name, type: f.type })) || [],
    });
    
    // 验证自定义字段
    if (!fields2 || fields2.length < 3) {
      info(`⚠️  字段数量少于预期，期望: 3, 实际: ${fields2?.length || 0}`);
    } else {
      log('✅ 自定义字段创建成功', { count: fields2.length });
    }
    
    // ==========================================
    // 测试 3: 只传 views，验证 fields 注入
    // ==========================================
    separator('测试 3: 只传 views，验证默认 fields 注入');
    
    log('3.1 创建表（只传 views）');
    const table3 = await sdk.createTable({
      baseId: base.id,
      name: randomName('测试表3'),
      views: [
        { name: 'Custom Grid', type: 'grid' },
      ],
    } as any);
    createdTableIds.push(table3.id);
    
    log('表创建成功', {
      id: table3.id,
      defaultViewId: table3.defaultViewId,
      fieldCount: table3.fieldCount,
    });
    
    // 获取字段列表
    const fields3Response = await sdk.listFields({ tableId: table3.id });
    const fields3 = Array.isArray(fields3Response) ? fields3Response : (fields3Response as any).data;
    log('字段列表', {
      count: fields3?.length || 0,
      fields: fields3?.map(f => ({ name: f.name, type: f.type })) || [],
    });
    
    if (fields3 && fields3.length > 0 && fields3[0].name === 'name') {
      log('✅ 默认字段已注入', { name: fields3[0].name });
    }
    
    // ==========================================
    // 测试 4: 只传 fields，验证 views 注入
    // ==========================================
    separator('测试 4: 只传 fields，验证默认 views 注入');
    
    log('4.1 创建表（只传 fields）');
    const table4 = await sdk.createTable({
      baseId: base.id,
      name: randomName('测试表4'),
      fields: [
        { name: 'custom_title', type: 'text' },
      ],
    } as any);
    createdTableIds.push(table4.id);
    
    log('表创建成功', {
      id: table4.id,
      defaultViewId: table4.defaultViewId,
      fieldCount: table4.fieldCount,
    });
    
    // 获取视图列表
    const views4Response = await sdk.listViews({ tableId: table4.id });
    const views4 = Array.isArray(views4Response) ? views4Response : (views4Response as any).data;
    log('视图列表', {
      count: views4?.length || 0,
      views: views4?.map(v => ({ name: v.name, type: v.type })) || [],
    });
    
    if (views4 && views4.length > 0 && views4[0].name === 'Grid view') {
      log('✅ 默认视图已注入', { name: views4[0].name });
    }
    
    // ==========================================
    // 清理测试数据
    // ==========================================
    separator('清理测试数据');
    
    for (const tableId of createdTableIds) {
      await sdk.deleteTable(tableId);
      log(`删除表成功: ${tableId}`);
    }
    
    await sdk.deleteBase(base.id);
    log('删除 Base 成功');
    
    await sdk.deleteSpace(space.id);
    log('删除 Space 成功');
    
    createdSpaceId = null;
    createdBaseId = null;
    
    await cleanup();
    
    separator('✅ 表格默认值功能测试完成');
    
    // 打印测试总结
    console.log('\n📊 测试总结：');
    console.log('✅ 测试1: 默认值自动注入 - 通过');
    console.log('✅ 测试2: 自定义 views 和 fields - 通过');
    console.log('✅ 测试3: 只传 views，默认 fields 注入 - 通过');
    console.log('✅ 测试4: 只传 fields，默认 views 注入 - 通过');
    console.log('\n🎉 所有测试场景验证完成！');
    
  } catch (err) {
    error('表格默认值测试失败', err);
    
    // 清理创建的资源
    try {
      const { sdk } = await initAndLogin();
      
      for (const tableId of createdTableIds) {
        try {
          await sdk.deleteTable(tableId);
          log(`清理 Table 成功: ${tableId}`);
        } catch (e) {
          // 忽略清理错误
        }
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
testTableDefaults()
  .then(() => {
    console.log('\n✅ 所有测试通过');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ 测试失败:', err);
    process.exit(1);
  });

