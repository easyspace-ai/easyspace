/**
 * YJS 记录操作测试
 * 专门测试记录的实时创建、更新、删除操作
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

async function testRecordOperations() {
  console.log('============================================================');
  console.log('YJS 记录操作测试');
  console.log('============================================================\n');

  const sdk = new LuckDB({
    baseUrl: config.apiUrl,
    debug: true,
  });

  let testRecordId: string | null = null;

  try {
    // 1. 登录
    console.log('🔐 登录...');
    await sdk.login({
      email: config.testEmail,
      password: config.testPassword,
    });
    console.log('✅ 登录成功\n');

    // 2. 连接 YJS
    console.log('🔗 连接 YJS...');
    await sdk.connectYJS();
    console.log('✅ YJS 连接成功\n');

    // 3. 获取表格和字段信息
    console.log('📋 获取表格信息...');
    const table = await sdk.getTable(TEST_CONFIG.tableId);
    const fields = await sdk.listFields({ tableId: TEST_CONFIG.tableId });
    
    console.log(`表格: ${table.name}`);
    console.log(`字段数量: ${fields.length}`);
    console.log('');

    // 4. 设置实时监听
    console.log('👂 设置实时监听...');
    
    // 监听表格更新
    sdk.subscribeToTableRealtime(TEST_CONFIG.tableId, (updates) => {
      console.log('📡 [表格更新]', JSON.stringify(updates, null, 2));
    });

    // 监听记录更新
    const recordUpdateHandler = (updates: any) => {
      console.log('📡 [记录更新]', JSON.stringify(updates, null, 2));
    };

    console.log('✅ 实时监听设置完成\n');

    // 5. 创建测试记录
    console.log('➕ 创建测试记录...');
    const recordData: any = {};
    
    // 为每个字段设置测试值
    fields.forEach((field, index) => {
      switch (field.type) {
        case 'text':
        case 'singleLineText':
          recordData[field.id] = `测试文本_${index + 1}`;
          break;
        case 'number':
          recordData[field.id] = Math.floor(Math.random() * 1000);
          break;
        case 'date':
          recordData[field.id] = new Date().toISOString().split('T')[0];
          break;
        case 'checkbox':
          recordData[field.id] = Math.random() > 0.5;
          break;
        default:
          recordData[field.id] = `默认值_${index + 1}`;
      }
    });

    const newRecord = await sdk.createRecord({
      tableId: TEST_CONFIG.tableId,
      data: recordData,
    });

    testRecordId = newRecord.id;
    console.log(`✅ 记录创建成功，ID: ${testRecordId}`);
    console.log('记录数据:', JSON.stringify(recordData, null, 2));
    console.log('');

    // 6. 订阅该记录的实时更新
    console.log('👂 订阅记录实时更新...');
    sdk.subscribeToRecordRealtime(TEST_CONFIG.tableId, testRecordId, recordUpdateHandler);
    console.log('✅ 记录订阅成功\n');

    // 7. 使用 YJS 实时更新记录字段
    console.log('🔄 使用 YJS 更新记录字段...');
    if (fields.length > 0) {
      const testField = fields[0];
      const newValue = `YJS更新_${Date.now()}`;
      
      await sdk.updateRecordFieldRealtime(
        TEST_CONFIG.tableId,
        testRecordId,
        testField.id,
        newValue
      );
      console.log(`✅ 字段 "${testField.name}" 更新为: ${newValue}`);
    }
    console.log('');

    // 8. 批量更新多个字段
    console.log('🔄 批量更新多个字段...');
    const batchUpdates: Record<string, any> = {};
    fields.slice(0, Math.min(3, fields.length)).forEach((field, index) => {
      batchUpdates[field.id] = `批量更新_${index + 1}_${Date.now()}`;
    });

    await sdk.batchUpdateRecordFieldsRealtime(
      TEST_CONFIG.tableId,
      testRecordId,
      batchUpdates
    );
    console.log('✅ 批量更新完成');
    console.log('更新字段:', Object.keys(batchUpdates));
    console.log('');

    // 9. 使用传统 API 更新记录（对比测试）
    console.log('🔄 使用传统 API 更新记录...');
    const apiUpdateData: any = {};
    if (fields.length > 1) {
      const field = fields[1];
      apiUpdateData[field.id] = `API更新_${Date.now()}`;
    }

    const updatedRecord = await sdk.updateRecord(
      TEST_CONFIG.tableId,
      testRecordId,
      apiUpdateData
    );
    console.log('✅ 传统 API 更新完成');
    console.log('');

    // 10. 等待观察实时更新
    console.log('⏳ 等待 8 秒观察实时更新...');
    console.log('在此期间，你可以：');
    console.log('1. 在另一个终端运行相同的测试');
    console.log('2. 通过 Web 界面操作记录');
    console.log('3. 观察这里的实时更新日志\n');

    await new Promise(resolve => setTimeout(resolve, 8000));

    // 11. 获取记录详情
    console.log('📄 获取记录详情...');
    const recordDetail = await sdk.getRecord(TEST_CONFIG.tableId, testRecordId);
    console.log('记录详情:', JSON.stringify(recordDetail.data, null, 2));
    console.log('');

    // 12. 测试字段订阅
    if (fields.length > 0) {
      console.log('👂 测试字段订阅...');
      const testField = fields[0];
      
      sdk.subscribeToFieldRealtime(
        TEST_CONFIG.tableId,
        testField.id,
        (updates) => {
          console.log(`📡 [字段更新] ${testField.name}:`, JSON.stringify(updates, null, 2));
        }
      );
      
      // 再次更新该字段
      const fieldUpdateValue = `字段订阅测试_${Date.now()}`;
      await sdk.updateRecordFieldRealtime(
        TEST_CONFIG.tableId,
        testRecordId,
        testField.id,
        fieldUpdateValue
      );
      console.log(`✅ 字段 "${testField.name}" 更新为: ${fieldUpdateValue}`);
      console.log('');
    }

    // 13. 等待更多实时更新
    console.log('⏳ 再等待 5 秒观察字段更新...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 14. 清理测试记录
    console.log('🗑️  清理测试记录...');
    await sdk.deleteRecord(TEST_CONFIG.tableId, testRecordId);
    console.log('✅ 测试记录已删除');
    console.log('');

    // 15. 断开连接
    console.log('🔌 断开连接...');
    sdk.disconnectYJS();
    await sdk.logout();
    console.log('✅ 连接已断开');

  } catch (error: any) {
    console.error('❌ 测试失败:', error.message || error);
    console.error('\n错误详情:', error);
    
    // 尝试清理
    try {
      if (testRecordId) {
        console.log('🧹 尝试清理测试记录...');
        await sdk.deleteRecord(TEST_CONFIG.tableId, testRecordId);
      }
      sdk.disconnectYJS();
      await sdk.logout();
    } catch (cleanupError) {
      console.error('清理失败:', cleanupError);
    }
    
    process.exit(1);
  }

  console.log('\n============================================================');
  console.log('✅ YJS 记录操作测试完成！');
  console.log('============================================================');
}

// 运行测试
testRecordOperations()
  .then(() => {
    console.log('\n✅ 测试完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 测试失败:', error);
    process.exit(1);
  });
