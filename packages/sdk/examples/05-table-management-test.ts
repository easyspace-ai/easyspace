/**
 * 表管理功能测试
 * 测试重命名、复制、删除、容量统计等表管理功能
 */

import { getSDK } from './common/sdk';
import { config } from './common/config';
import type { 
  LuckDB, 
  Table, 
  RenameTableRequest, 
  DuplicateTableRequest,
  TableUsageResponse,
  TableManagementMenu
} from '../src';

async function testTableManagement() {
  console.log('🚀 开始表管理功能测试...\n');

  const sdk = getSDK();

  try {
    // 1. 登录认证
    console.log('📝 步骤 1: 用户登录');
    const authResponse = await sdk.auth.login({
      email: config.testEmail,
      password: config.testPassword,
    });
    console.log('✅ 登录成功:', authResponse.user.name);
    console.log('');

    // 2. 获取空间和基础表
    console.log('📝 步骤 2: 获取测试空间和基础表');
    const spaces = await sdk.spaces.listSpaces();
    if (spaces.length === 0) {
      throw new Error('没有找到测试空间');
    }
    const space = spaces[0];
    console.log('✅ 找到测试空间:', space.name);

    const bases = await sdk.bases.listBases({ spaceId: space.id });
    if (bases.length === 0) {
      throw new Error('没有找到测试基础表');
    }
    const base = bases[0];
    console.log('✅ 找到测试基础表:', base.name);
    console.log('');

    // 3. 创建测试表
    console.log('📝 步骤 3: 创建测试表');
    const testTable = await sdk.tables.createTable({
      baseId: base.id,
      name: '表管理测试表',
      description: '用于测试表管理功能的临时表',
    });
    console.log('✅ 测试表创建成功:', testTable.name);
    console.log('   表ID:', testTable.id);
    console.log('');

    // 4. 测试获取表管理菜单
    console.log('📝 步骤 4: 获取表管理菜单');
    const menu: TableManagementMenu = await sdk.tables.getTableManagementMenu(testTable.id);
    console.log('✅ 表管理菜单获取成功:');
    console.log('   表名:', menu.table.name);
    console.log('   记录数:', menu.usage.recordCount);
    console.log('   使用率:', menu.usage.usagePercentage.toFixed(2) + '%');
    console.log('   可用操作:', Object.keys(menu.actions).join(', '));
    console.log('');

    // 5. 测试重命名表
    console.log('📝 步骤 5: 重命名表');
    const newName = '重命名后的测试表';
    const renameRequest: RenameTableRequest = {
      name: newName,
    };
    const renamedTable: Table = await sdk.tables.renameTable(testTable.id, renameRequest);
    console.log('✅ 表重命名成功:');
    console.log('   新表名:', renamedTable.name);
    console.log('   更新时间:', renamedTable.updatedAt);
    console.log('');

    // 6. 测试获取表用量
    console.log('📝 步骤 6: 获取表用量信息');
    const usage: TableUsageResponse = await sdk.tables.getTableUsage(renamedTable.id);
    console.log('✅ 表用量信息获取成功:');
    console.log('   当前记录数:', usage.recordCount);
    console.log('   最大记录数:', usage.maxRecords);
    console.log('   使用百分比:', usage.usagePercentage.toFixed(2) + '%');
    console.log('   存储大小:', (usage.storageSize / 1024).toFixed(2) + ' KB');
    console.log('   最大存储:', (usage.maxStorageSize / 1024 / 1024).toFixed(2) + ' MB');
    console.log('');

    // 7. 测试复制表
    console.log('📝 步骤 7: 复制表');
    const duplicateRequest: DuplicateTableRequest = {
      name: '复制的测试表',
      withData: false,      // 不复制数据
      withViews: true,      // 复制视图
      withFields: true,     // 复制字段配置
    };
    const duplicatedTable: Table = await sdk.tables.duplicateTable(renamedTable.id, duplicateRequest);
    console.log('✅ 表复制成功:');
    console.log('   新表名:', duplicatedTable.name);
    console.log('   新表ID:', duplicatedTable.id);
    console.log('   创建时间:', duplicatedTable.createdAt);
    console.log('');

    // 8. 验证复制结果
    console.log('📝 步骤 8: 验证复制结果');
    const duplicatedTableUsage = await sdk.tables.getTableUsage(duplicatedTable.id);
    console.log('✅ 复制表用量信息:');
    console.log('   记录数:', duplicatedTableUsage.recordCount);
    console.log('   使用率:', duplicatedTableUsage.usagePercentage.toFixed(2) + '%');
    console.log('');

    // 9. 测试获取复制表的管理菜单
    console.log('📝 步骤 9: 获取复制表的管理菜单');
    const duplicatedMenu = await sdk.tables.getTableManagementMenu(duplicatedTable.id);
    console.log('✅ 复制表管理菜单获取成功:');
    console.log('   表名:', duplicatedMenu.table.name);
    console.log('   重命名可用:', duplicatedMenu.actions.rename.enabled);
    console.log('   复制可用:', duplicatedMenu.actions.duplicate.enabled);
    console.log('   删除可用:', duplicatedMenu.actions.delete.enabled);
    console.log('');

    // 10. 清理测试数据
    console.log('📝 步骤 10: 清理测试数据');
    console.log('🗑️ 删除复制的测试表...');
    await sdk.tables.deleteTable(duplicatedTable.id);
    console.log('✅ 复制表删除成功');

    console.log('🗑️ 删除原始测试表...');
    await sdk.tables.deleteTable(renamedTable.id);
    console.log('✅ 原始表删除成功');
    console.log('');

    console.log('🎉 表管理功能测试全部通过！');
    console.log('');
    console.log('📊 测试总结:');
    console.log('   ✅ 获取表管理菜单');
    console.log('   ✅ 重命名表');
    console.log('   ✅ 获取表用量信息');
    console.log('   ✅ 复制表');
    console.log('   ✅ 删除表');
    console.log('   ✅ 数据清理完成');

  } catch (error: any) {
    console.error('❌ 表管理功能测试失败:');
    if (error.code) {
      console.error('   错误码:', error.code);
    }
    if (error.message) {
      console.error('   错误信息:', error.message);
    }
    if (error.details) {
      console.error('   错误详情:', JSON.stringify(error.details, null, 2));
    }
    console.error('');
    console.error('完整错误信息:', error);
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  testTableManagement().catch((error) => {
    console.error('测试执行失败:', error);
    process.exit(1);
  });
}

export { testTableManagement };
