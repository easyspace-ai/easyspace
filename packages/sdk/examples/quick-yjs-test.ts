/**
 * 快速 YJS 测试
 * 用于快速验证 YJS 功能是否正常工作
 */

import LuckDB from '../src';
import { config, getTargetResources, printConfig } from './common/config';

// 从配置中获取目标资源
const TEST_CONFIG = getTargetResources();

async function quickYjsTest() {
  console.log('🚀 快速 YJS 测试...\n');

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
    console.log('✅ 登录成功');

    // 2. 检查 YJS
    console.log('🔍 检查 YJS...');
    if (!sdk.isYjsAvailable()) {
      throw new Error('YJS 不可用');
    }
    console.log('✅ YJS 可用');

    // 3. 连接 YJS
    console.log('🔗 连接 YJS...');
    await sdk.connectYJS();
    console.log('✅ YJS 连接成功');

    // 4. 获取表格信息
    console.log('📋 获取表格信息...');
    const table = await sdk.getTable(TEST_CONFIG.tableId);
    const fields = await sdk.listFields({ tableId: TEST_CONFIG.tableId });
    console.log(`✅ 表格: ${table.name}, 字段数: ${fields.length}`);

    // 5. 测试 YJS 文档
    console.log('📄 测试 YJS 文档...');
    const doc = sdk.getYjsDocument(`table-${TEST_CONFIG.tableId}`);
    console.log('✅ YJS 文档获取成功');

    // 6. 创建测试记录并测试实时更新
    let testRecordId: string | null = null;
    if (fields.length > 0) {
      console.log('📝 创建测试记录...');
      const field = fields[0];
      const testRecordData: any = {};
      testRecordData[field.id] = `初始值_${Date.now()}`;
      
      const newRecord = await sdk.createRecord({
        tableId: TEST_CONFIG.tableId,
        data: testRecordData,
      });
      testRecordId = newRecord.id;
      console.log(`✅ 创建记录成功，ID: ${testRecordId}`);

      console.log('🔄 测试实时更新...');
      await sdk.updateRecordFieldRealtime(
        TEST_CONFIG.tableId,
        testRecordId,
        field.id,
        `测试_${Date.now()}`
      );
      console.log('✅ 实时更新成功');
    }

    // 7. 清理测试记录
    if (testRecordId) {
      console.log('🗑️  清理测试记录...');
      await sdk.deleteRecord(TEST_CONFIG.tableId, testRecordId);
      console.log('✅ 测试记录已删除');
    }

    // 8. 清理连接
    console.log('🧹 清理连接...');
    sdk.disconnectYJS();
    await sdk.logout();
    console.log('✅ 清理完成');

    console.log('\n🎉 快速测试通过！');

  } catch (error: any) {
    console.error('❌ 测试失败:', error.message);
    process.exit(1);
  }
}

quickYjsTest()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  });
