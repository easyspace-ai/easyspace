/**
 * YJS 发现测试
 * 自动发现可用的表格和基础表，然后进行 YJS 测试
 */

import LuckDB from '../src';
import { config, printConfig, getTestConfig } from './common/config';

async function discoverAndTestYjs() {
  console.log('🔍 YJS 发现测试...\n');

  // 打印当前配置
  printConfig();

  const sdk = new LuckDB({
    baseUrl: config.apiUrl,
    debug: config.debug,
  });

  try {
    // 1. 登录
    console.log('🔐 登录...');
    await sdk.login({
      email: config.testEmail,
      password: config.testPassword,
    });
    console.log('✅ 登录成功\n');

    // 2. 发现可用的空间
    console.log('🏠 发现空间...');
    const spaces = await sdk.listSpaces();
    console.log(`找到 ${spaces.length} 个空间:`);
    spaces.forEach((space, i) => {
      console.log(`  ${i + 1}. ${space.name} (${space.id})`);
    });
    console.log('');

    if (spaces.length === 0) {
      console.log('❌ 没有找到空间，无法继续测试');
      return;
    }

    // 3. 发现基础表
    console.log('📋 发现基础表...');
    const bases = await sdk.listBases();
    console.log(`找到 ${bases.length} 个基础表:`);
    bases.forEach((base, i) => {
      console.log(`  ${i + 1}. ${base.name} (${base.id}) - 空间: ${base.spaceId}`);
    });
    console.log('');

    if (bases.length === 0) {
      console.log('❌ 没有找到基础表，无法继续测试');
      return;
    }

    // 4. 选择第一个基础表进行测试
    const testBase = bases[0];
    console.log(`🎯 选择基础表进行测试: ${testBase.name} (${testBase.id})\n`);

    // 5. 发现表格
    console.log('📊 发现表格...');
    const tables = await sdk.listTables({ baseId: testBase.id });
    console.log(`找到 ${tables.length} 个表格:`);
    tables.forEach((table, i) => {
      console.log(`  ${i + 1}. ${table.name} (${table.id})`);
    });
    console.log('');

    if (tables.length === 0) {
      console.log('❌ 没有找到表格，无法继续测试');
      return;
    }

    // 6. 选择第一个表格进行测试
    const testTable = tables[0];
    console.log(`🎯 选择表格进行测试: ${testTable.name} (${testTable.id})\n`);

    // 7. 检查 YJS 状态
    console.log('🔍 检查 YJS 状态...');
    console.log('YJS 可用:', sdk.isYjsAvailable() ? '✅' : '❌');
    console.log('YJS 连接状态:', sdk.getYjsConnectionState());
    console.log('');

    // 8. 连接 YJS
    console.log('🔗 连接 YJS...');
    await sdk.connectYJS();
    console.log('✅ YJS 连接成功');
    console.log('YJS 连接状态:', sdk.getYjsConnectionState());
    console.log('');

    // 9. 获取字段
    console.log('📝 获取字段...');
    const fields = await sdk.listFields({ tableId: testTable.id });
    console.log(`字段数量: ${fields.length}`);
    fields.forEach((field, i) => {
      console.log(`  ${i + 1}. ${field.name} (${field.type}) - ID: ${field.id}`);
    });
    console.log('');

    // 10. 测试 YJS 文档
    console.log('📄 测试 YJS 文档...');
    const docId = `table-${testTable.id}`;
    const doc = sdk.getYjsDocument(docId);
    console.log(`✅ 获取文档: ${docId}`);
    console.log('');

    // 11. 测试记录操作
    console.log('📝 测试记录操作...');
    
    // 创建测试记录
    const testRecordData: any = {};
    if (fields.length > 0) {
      const firstField = fields[0];
      testRecordData[firstField.id] = `发现测试_${Date.now()}`;
    }

    const newRecord = await sdk.createRecord({
      tableId: testTable.id,
      data: testRecordData,
    });
    console.log(`✅ 创建记录成功，ID: ${newRecord.id}`);
    console.log('');

    // 12. 测试 YJS 实时更新
    console.log('🔄 测试 YJS 实时更新...');
    if (fields.length > 0) {
      const testField = fields[0];
      const updateValue = `YJS更新_${Date.now()}`;
      
      await sdk.updateRecordFieldRealtime(
        testTable.id,
        newRecord.id,
        testField.id,
        updateValue
      );
      console.log(`✅ 字段 "${testField.name}" 更新为: ${updateValue}`);
    }
    console.log('');

    // 13. 测试订阅
    console.log('👂 测试 YJS 订阅...');
    let updateCount = 0;
    
    sdk.subscribeToTableRealtime(testTable.id, (updates) => {
      updateCount++;
      console.log(`📡 [表格更新 #${updateCount}]`, JSON.stringify(updates, null, 2));
    });

    sdk.subscribeToRecordRealtime(testTable.id, newRecord.id, (updates) => {
      console.log('📡 [记录更新]', JSON.stringify(updates, null, 2));
    });

    console.log('✅ 订阅设置完成');
    console.log('');

    // 14. 等待观察更新
    console.log('⏳ 等待 5 秒观察实时更新...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('');

    // 15. 获取更新后的记录
    console.log('📄 获取更新后的记录...');
    const updatedRecord = await sdk.getRecord(testTable.id, newRecord.id);
    console.log('记录数据:', JSON.stringify(updatedRecord.data, null, 2));
    console.log('');

    // 16. 清理测试记录
    console.log('🗑️  清理测试记录...');
    await sdk.deleteRecord(testTable.id, newRecord.id);
    console.log('✅ 测试记录已删除');
    console.log('');

    // 17. 断开连接
    console.log('🔌 断开连接...');
    sdk.disconnectYJS();
    await sdk.logout();
    console.log('✅ 连接已断开');

    console.log('\n🎉 YJS 发现测试完成！');
    console.log(`\n📊 测试总结:`);
    console.log(`- 空间数量: ${spaces.length}`);
    console.log(`- 基础表数量: ${bases.length}`);
    console.log(`- 表格数量: ${tables.length}`);
    console.log(`- 测试表格: ${testTable.name}`);
    console.log(`- 字段数量: ${fields.length}`);

  } catch (error: any) {
    console.error('❌ 测试失败:', error.message || error);
    console.error('\n错误详情:', error);
    
    // 尝试清理
    try {
      sdk.disconnectYJS();
      await sdk.logout();
    } catch (cleanupError) {
      console.error('清理失败:', cleanupError);
    }
    
    process.exit(1);
  }
}

// 运行测试
discoverAndTestYjs()
  .then(() => {
    console.log('\n✅ 测试完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 测试失败:', error);
    process.exit(1);
  });
