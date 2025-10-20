/**
 * YJS 表格操作测试
 * 测试 YJS 实时协作功能，包括记录创建、更新、删除等操作
 * 
 * 目标表信息：
 * - Base ID: 7ec1e878-91b9-4c1b-ad86-05cdf801318f
 * - Table ID: tbl_nAG0ClAIJbTquwVxRuPfE
 */

import LuckDB from '../src';
import { config } from './common/config';

// 测试配置
const TEST_CONFIG = {
  baseId: '7ec1e878-91b9-4c1b-ad86-05cdf801318f',
  tableId: 'tbl_nAG0ClAIJbTquwVxRuPfE',
  testRecordId: 'rec_test_' + Date.now(),
};

async function testYjsTableOperations() {
  console.log('============================================================');
  console.log('YJS 表格操作测试');
  console.log('============================================================\n');

  const sdk = new LuckDB({
    baseUrl: config.apiUrl,
    debug: true,
  });

  try {
    // 1. 登录
    console.log('🔐 登录...');
    const loginResponse = await sdk.login({
      email: config.testEmail,
      password: config.testPassword,
    });
    console.log('✅ 登录成功，用户:', loginResponse.user.name);

    // 2. 检查 YJS 是否可用
    console.log('\n🔍 检查 YJS 客户端状态...');
    const isYjsAvailable = sdk.isYjsAvailable();
    console.log('YJS 可用性:', isYjsAvailable ? '✅ 可用' : '❌ 不可用');

    if (!isYjsAvailable) {
      throw new Error('YJS 客户端未初始化');
    }

    // 3. 连接 YJS
    console.log('\n🔗 连接 YJS...');
    await sdk.connectYJS();
    console.log('✅ YJS 连接成功');

    // 4. 获取表格信息
    console.log('\n📋 获取表格信息...');
    const table = await sdk.getTable(TEST_CONFIG.tableId);
    console.log('表格名称:', table.name);
    console.log('表格描述:', table.description || '无');
    console.log('字段数量:', table.fields?.length || 0);

    // 5. 获取字段列表
    console.log('\n📝 获取字段列表...');
    const fields = await sdk.listFields({ tableId: TEST_CONFIG.tableId });
    console.log('字段列表:');
    fields.forEach((field, index) => {
      console.log(`  ${index + 1}. ${field.name} (${field.type}) - ID: ${field.id}`);
    });

    // 6. 测试 YJS 文档操作
    console.log('\n📄 测试 YJS 文档操作...');
    const documentId = `table-${TEST_CONFIG.tableId}`;
    const yjsDoc = sdk.getYjsDocument(documentId);
    console.log('✅ 获取 YJS 文档成功，ID:', documentId);

    // 7. 订阅表格实时更新
    console.log('\n👂 订阅表格实时更新...');
    sdk.subscribeToTableRealtime(TEST_CONFIG.tableId, (updates) => {
      console.log('📡 收到表格更新:', JSON.stringify(updates, null, 2));
    });
    console.log('✅ 表格订阅成功');

    // 8. 测试记录创建（通过 YJS）
    console.log('\n➕ 测试记录创建...');
    const testRecordData = {
      name: `测试记录_${Date.now()}`,
      description: '这是一个通过 YJS 创建的测试记录',
      status: 'active',
      created_at: new Date().toISOString(),
    };

    // 使用 YJS 实时更新记录字段
    if (fields.length > 0) {
      const firstField = fields[0];
      console.log(`使用字段 "${firstField.name}" 进行测试`);
      
      await sdk.updateRecordFieldRealtime(
        TEST_CONFIG.tableId,
        TEST_CONFIG.testRecordId,
        firstField.id,
        testRecordData.name
      );
      console.log('✅ YJS 字段更新成功');
    }

    // 9. 测试批量字段更新
    console.log('\n🔄 测试批量字段更新...');
    const batchUpdates: Record<string, any> = {};
    fields.slice(0, 3).forEach((field, index) => {
      batchUpdates[field.id] = `批量更新_${index + 1}_${Date.now()}`;
    });

    await sdk.batchUpdateRecordFieldsRealtime(
      TEST_CONFIG.tableId,
      TEST_CONFIG.testRecordId,
      batchUpdates
    );
    console.log('✅ YJS 批量字段更新成功');

    // 10. 订阅记录实时更新
    console.log('\n👂 订阅记录实时更新...');
    sdk.subscribeToRecordRealtime(
      TEST_CONFIG.tableId,
      TEST_CONFIG.testRecordId,
      (updates) => {
        console.log('📡 收到记录更新:', JSON.stringify(updates, null, 2));
      }
    );
    console.log('✅ 记录订阅成功');

    // 11. 测试字段订阅
    if (fields.length > 0) {
      console.log('\n👂 订阅字段实时更新...');
      const testField = fields[0];
      sdk.subscribeToFieldRealtime(
        TEST_CONFIG.tableId,
        testField.id,
        (updates) => {
          console.log('📡 收到字段更新:', JSON.stringify(updates, null, 2));
        }
      );
      console.log(`✅ 字段 "${testField.name}" 订阅成功`);
    }

    // 12. 测试视图订阅
    console.log('\n👂 获取并订阅视图...');
    try {
      const views = await sdk.listViews({ tableId: TEST_CONFIG.tableId });
      if (views.length > 0) {
        const testView = views[0];
        sdk.subscribeToViewRealtime(
          TEST_CONFIG.tableId,
          testView.id,
          (updates) => {
            console.log('📡 收到视图更新:', JSON.stringify(updates, null, 2));
          }
        );
        console.log(`✅ 视图 "${testView.name}" 订阅成功`);
      } else {
        console.log('ℹ️  没有找到视图');
      }
    } catch (viewError) {
      console.log('ℹ️  视图操作失败（可能不支持）:', (viewError as any).message);
    }

    // 13. 测试 SSE 连接
    console.log('\n📡 测试 SSE 连接...');
    sdk.connectSSE();
    console.log('SSE 状态:', sdk.getSSEState());

    // 14. 监听 SSE 事件
    console.log('\n👂 监听 SSE 事件...');
    sdk.collaboration.onRecordUpdate((message) => {
      console.log('📡 SSE 记录更新:', JSON.stringify(message, null, 2));
    });

    sdk.collaboration.onTableUpdate((message) => {
      console.log('📡 SSE 表格更新:', JSON.stringify(message, null, 2));
    });

    sdk.collaboration.onSSEConnected(() => {
      console.log('✅ SSE 连接成功');
    });

    sdk.collaboration.onSSEError((error) => {
      console.log('❌ SSE 错误:', error);
    });

    // 15. 等待一段时间让用户观察实时更新
    console.log('\n⏳ 等待 10 秒以观察实时更新...');
    console.log('在此期间，你可以：');
    console.log('1. 在另一个终端运行其他测试');
    console.log('2. 通过 Web 界面操作表格');
    console.log('3. 观察这里的实时更新日志\n');

    await new Promise(resolve => setTimeout(resolve, 10000));

    // 16. 测试传统 API 操作（对比）
    console.log('\n📝 测试传统 API 操作...');
    try {
      const records = await sdk.listRecords({
        tableId: TEST_CONFIG.tableId,
        limit: 5
      });
      console.log(`✅ 获取到 ${records.data.length} 条记录`);
      
      if (records.data.length > 0) {
        const firstRecord = records.data[0];
        console.log('第一条记录:', firstRecord.id);
      }
    } catch (apiError) {
      console.log('⚠️  传统 API 操作失败:', (apiError as any).message);
    }

    // 17. 获取连接状态
    console.log('\n📊 连接状态:');
    console.log('YJS 连接状态:', sdk.getYjsConnectionState());
    console.log('SSE 连接状态:', sdk.getSSEState());

    // 18. 清理和断开连接
    console.log('\n🧹 清理连接...');
    sdk.disconnectYJS();
    sdk.disconnectSSE();
    console.log('✅ 连接已断开');

    // 19. 登出
    console.log('\n🚪 登出...');
    await sdk.logout();
    console.log('✅ 登出成功');

  } catch (error: any) {
    console.error('❌ 测试失败:', error.message || error);
    console.error('\n错误详情:', error);
    
    // 尝试清理
    try {
      sdk.disconnectYJS();
      sdk.disconnectSSE();
      await sdk.logout();
    } catch (cleanupError) {
      console.error('清理失败:', cleanupError);
    }
    
    process.exit(1);
  }

  console.log('\n============================================================');
  console.log('✅ YJS 表格操作测试完成！');
  console.log('============================================================');
}

// 运行测试
testYjsTableOperations()
  .then(() => {
    console.log('\n✅ 测试完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 测试失败:', error);
    process.exit(1);
  });
