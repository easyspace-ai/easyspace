/**
 * YJS 简单测试
 * 快速测试 YJS 基本功能
 * 
 * 目标表信息：
 * - Base ID: 7ec1e878-91b9-4c1b-ad86-05cdf801318f
 * - Table ID: tbl_nAG0ClAIJbTquwVxRuPfE
 */

import LuckDB from '../src';
import { config, getTargetResources, getYjsConfig, printConfig } from './common/config';

// 从配置中获取目标资源
const TEST_CONFIG = getTargetResources();

async function simpleYjsTest() {
  console.log('🚀 YJS 简单测试开始...\n');

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

    // 2. 检查 YJS 状态
    console.log('🔍 YJS 状态检查...');
    console.log('YJS 可用:', sdk.isYjsAvailable() ? '✅' : '❌');
    console.log('YJS 连接状态:', sdk.getYjsConnectionState());
    console.log('');

    // 3. 连接 YJS
    console.log('🔗 连接 YJS...');
    await sdk.connectYJS();
    console.log('✅ YJS 连接成功\n');

    // 4. 获取表格信息
    console.log('📋 获取表格信息...');
    const table = await sdk.getTable(TEST_CONFIG.tableId);
    console.log(`表格: ${table.name} (${table.id})`);
    console.log('');

    // 5. 获取字段
    console.log('📝 获取字段...');
    const fields = await sdk.listFields({ tableId: TEST_CONFIG.tableId });
    console.log(`字段数量: ${fields.length}`);
    fields.forEach((field, i) => {
      console.log(`  ${i + 1}. ${field.name} (${field.type})`);
    });
    console.log('');

    // 6. 测试 YJS 文档
    console.log('📄 测试 YJS 文档...');
    const docId = `table-${TEST_CONFIG.tableId}`;
    const doc = sdk.getYjsDocument(docId);
    console.log(`✅ 获取文档: ${docId}`);
    console.log('');

    // 7. 创建测试记录
    let testRecordId: string | null = null;
    if (fields.length > 0) {
      console.log('📝 创建测试记录...');
      const testField = fields[0];
      const testRecordData: any = {};
      testRecordData[testField.id] = `初始值_${Date.now()}`;
      
      const newRecord = await sdk.createRecord({
        tableId: TEST_CONFIG.tableId,
        data: testRecordData,
      });
      testRecordId = newRecord.id;
      console.log(`✅ 创建记录成功，ID: ${testRecordId}`);
      console.log('');
    }

    // 8. 测试实时更新
    if (testRecordId && fields.length > 0) {
      console.log('🔄 测试实时更新...');
      const testField = fields[0];
      const testValue = `YJS更新_${Date.now()}`;
      
      await sdk.updateRecordFieldRealtime(
        TEST_CONFIG.tableId,
        testRecordId,
        testField.id,
        testValue
      );
      console.log(`✅ 更新字段 "${testField.name}" 为: ${testValue}`);
      console.log('');
    }

    // 9. 测试订阅
    console.log('👂 测试订阅...');
    sdk.subscribeToTableRealtime(TEST_CONFIG.tableId, (updates) => {
      console.log('📡 表格更新:', updates);
    });
    console.log('✅ 表格订阅成功');
    console.log('');

    // 10. 等待观察
    console.log('⏳ 等待 5 秒观察实时更新...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('');

    // 11. 清理测试记录
    if (testRecordId) {
      console.log('🗑️  清理测试记录...');
      await sdk.deleteRecord(TEST_CONFIG.tableId, testRecordId);
      console.log('✅ 测试记录已删除');
      console.log('');
    }

    // 12. 清理连接
    console.log('🧹 清理连接...');
    sdk.disconnectYJS();
    await sdk.logout();
    console.log('✅ 清理完成');

  } catch (error: any) {
    console.error('❌ 测试失败:', error.message);
    console.error('详情:', error);
    process.exit(1);
  }

  console.log('\n🎉 YJS 简单测试完成！');
}

// 运行测试
simpleYjsTest()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  });
