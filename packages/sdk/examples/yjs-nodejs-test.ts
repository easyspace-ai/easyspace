/**
 * YJS Node.js 环境测试
 * 专门为 Node.js 环境设计的 YJS 测试，不依赖浏览器特性
 * 
 * 目标表信息：
 * - Base ID: 7ec1e878-91b9-4c1b-ad86-05cdf801318f
 * - Table ID: tbl_nAG0ClAIJbTquwVxRuPfE
 */

import LuckDB from '../src';
import { config } from './common/config';

const TEST_CONFIG = {
  baseId: '7ec1e878-91b9-4c1b-ad86-05cdf801318f',
  tableId: 'tbl_nAG0ClAIJbTquwVxRuPfE',
};

async function yjsNodejsTest() {
  console.log('🚀 YJS Node.js 环境测试...\n');

  const sdk = new LuckDB({
    baseUrl: config.apiUrl,
    debug: true,
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
    console.log('🔍 检查 YJS 状态...');
    console.log('YJS 可用:', sdk.isYjsAvailable() ? '✅' : '❌');
    console.log('YJS 连接状态:', sdk.getYjsConnectionState());
    console.log('');

    // 3. 连接 YJS
    console.log('🔗 连接 YJS...');
    await sdk.connectYJS();
    console.log('✅ YJS 连接成功');
    console.log('YJS 连接状态:', sdk.getYjsConnectionState());
    console.log('');

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
      console.log(`  ${i + 1}. ${field.name} (${field.type}) - ID: ${field.id}`);
    });
    console.log('');

    // 6. 测试 YJS 文档
    console.log('📄 测试 YJS 文档...');
    const docId = `table-${TEST_CONFIG.tableId}`;
    const doc = sdk.getYjsDocument(docId);
    console.log(`✅ 获取文档: ${docId}`);
    console.log('');

    // 7. 测试记录操作
    console.log('📝 测试记录操作...');
    
    // 创建测试记录
    const testRecordData: any = {};
    if (fields.length > 0) {
      const firstField = fields[0];
      testRecordData[firstField.id] = `Node.js测试_${Date.now()}`;
    }

    const newRecord = await sdk.createRecord({
      tableId: TEST_CONFIG.tableId,
      data: testRecordData,
    });
    console.log(`✅ 创建记录成功，ID: ${newRecord.id}`);
    console.log('');

    // 8. 测试 YJS 实时更新
    console.log('🔄 测试 YJS 实时更新...');
    if (fields.length > 0) {
      const testField = fields[0];
      const updateValue = `YJS更新_${Date.now()}`;
      
      await sdk.updateRecordFieldRealtime(
        TEST_CONFIG.tableId,
        newRecord.id,
        testField.id,
        updateValue
      );
      console.log(`✅ 字段 "${testField.name}" 更新为: ${updateValue}`);
    }
    console.log('');

    // 9. 测试批量更新
    console.log('🔄 测试批量更新...');
    if (fields.length > 1) {
      const batchUpdates: Record<string, any> = {};
      fields.slice(0, Math.min(3, fields.length)).forEach((field, index) => {
        batchUpdates[field.id] = `批量更新_${index + 1}_${Date.now()}`;
      });

      await sdk.batchUpdateRecordFieldsRealtime(
        TEST_CONFIG.tableId,
        newRecord.id,
        batchUpdates
      );
      console.log('✅ 批量更新完成');
      console.log('更新字段:', Object.keys(batchUpdates));
    }
    console.log('');

    // 10. 测试订阅（不依赖 SSE）
    console.log('👂 测试 YJS 订阅...');
    let updateCount = 0;
    
    sdk.subscribeToTableRealtime(TEST_CONFIG.tableId, (updates) => {
      updateCount++;
      console.log(`📡 [表格更新 #${updateCount}]`, JSON.stringify(updates, null, 2));
    });

    sdk.subscribeToRecordRealtime(TEST_CONFIG.tableId, newRecord.id, (updates) => {
      console.log('📡 [记录更新]', JSON.stringify(updates, null, 2));
    });

    console.log('✅ 订阅设置完成');
    console.log('');

    // 11. 等待一段时间观察更新
    console.log('⏳ 等待 5 秒观察实时更新...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('');

    // 12. 获取更新后的记录
    console.log('📄 获取更新后的记录...');
    const updatedRecord = await sdk.getRecord(TEST_CONFIG.tableId, newRecord.id);
    console.log('记录数据:', JSON.stringify(updatedRecord.data, null, 2));
    console.log('');

    // 13. 清理测试记录
    console.log('🗑️  清理测试记录...');
    await sdk.deleteRecord(TEST_CONFIG.tableId, newRecord.id);
    console.log('✅ 测试记录已删除');
    console.log('');

    // 14. 断开连接
    console.log('🔌 断开连接...');
    sdk.disconnectYJS();
    await sdk.logout();
    console.log('✅ 连接已断开');

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

  console.log('\n🎉 YJS Node.js 测试完成！');
}

// 运行测试
yjsNodejsTest()
  .then(() => {
    console.log('\n✅ 测试完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 测试失败:', error);
    process.exit(1);
  });
