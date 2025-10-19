/**
 * ShareDB 实时协作功能使用示例
 * 展示如何使用 LuckDB SDK 的 ShareDB 功能进行实时协作
 */

import { LuckDB } from '../src/index.js';

// 初始化 SDK
const client = new LuckDB({
  baseUrl: 'http://localhost:8080',
  debug: true,
});

async function shareDBExample() {
  try {
    // 1. 登录用户
    console.log('🔐 登录用户...');
    const authResponse = await client.login({
      email: 'user@example.com',
      password: 'password123',
    });
    console.log('✅ 登录成功:', authResponse.user.email);

    // 2. 检查 ShareDB 连接状态
    console.log('🔌 ShareDB 连接状态:', client.getShareDBConnectionState());
    console.log('📊 ShareDB 可用性:', client.isShareDBAvailable());

    // 3. 实时更新记录字段
    console.log('📝 实时更新记录字段...');
    await client.updateRecordFieldRealtime('table_123', 'record_456', 'name', '新名称');
    console.log('✅ 记录字段更新成功');

    // 4. 批量实时更新记录字段
    console.log('📝 批量实时更新记录字段...');
    await client.batchUpdateRecordFieldsRealtime('table_123', 'record_456', {
      name: '批量更新名称',
      email: 'new@example.com',
      age: 25,
    });
    console.log('✅ 批量更新成功');

    // 5. 订阅记录变更
    console.log('👂 订阅记录变更...');
    const recordSubscription = client.subscribeToRecordRealtime(
      'table_123',
      'record_456',
      (updates) => {
        console.log('📨 收到记录更新:', updates);
      }
    );

    // 6. 订阅字段变更
    console.log('👂 订阅字段变更...');
    const fieldSubscription = client.subscribeToFieldRealtime(
      'table_123',
      'field_789',
      (updates) => {
        console.log('📨 收到字段更新:', updates);
      }
    );

    // 7. 订阅视图变更
    console.log('👂 订阅视图变更...');
    const viewSubscription = client.subscribeToViewRealtime('table_123', 'view_101', (updates) => {
      console.log('📨 收到视图更新:', updates);
    });

    // 8. 订阅表格变更
    console.log('👂 订阅表格变更...');
    const tableSubscription = client.subscribeToTableRealtime('table_123', (updates) => {
      console.log('📨 收到表格更新:', updates);
    });

    // 9. 获取 ShareDB 客户端进行高级操作
    const sharedbClient = client.getShareDBClient();
    if (sharedbClient) {
      console.log('🔧 使用 ShareDB 客户端进行高级操作...');

      // 获取文档
      const doc = sharedbClient.getDocument('record_table_123', 'record_456');
      console.log('📄 获取文档:', doc.id);

      // 直接提交操作
      await sharedbClient.submit('record_table_123', 'record_456', [
        {
          p: ['fields', 'status'],
          oi: 'active',
        },
      ]);
      console.log('✅ 直接操作提交成功');
    }

    // 10. 获取文档管理器进行文档操作
    const docManager = client.getDocumentManager();
    if (docManager) {
      console.log('🔧 使用文档管理器进行文档操作...');

      // 获取记录快照
      const snapshot = await docManager.getRecordSnapshot('table_123', 'record_456');
      console.log('📸 记录快照:', snapshot);

      // 查询记录
      const queryResult = await docManager.queryRecords('table_123', {
        filter: { status: 'active' },
        limit: 10,
      });
      console.log('🔍 查询结果:', queryResult);
    }

    // 11. 模拟一些操作来触发订阅回调
    console.log('🎭 模拟操作以触发订阅回调...');
    setTimeout(async () => {
      await client.updateRecordFieldRealtime(
        'table_123',
        'record_456',
        'lastModified',
        new Date().toISOString()
      );
    }, 2000);

    // 12. 清理订阅（在实际应用中，应该在组件卸载时清理）
    setTimeout(() => {
      console.log('🧹 清理订阅...');
      recordSubscription.unsubscribe();
      fieldSubscription.unsubscribe();
      viewSubscription.unsubscribe();
      tableSubscription.unsubscribe();
      console.log('✅ 订阅清理完成');
    }, 10000);
  } catch (error) {
    console.error('❌ 错误:', error);
  }
}

// 高级使用示例
async function advancedShareDBExample() {
  try {
    // 1. 使用操作构建器创建复杂操作
    const { OperationBuilder } = await import('../src/core/operation-builder.js');

    console.log('🔧 使用操作构建器...');

    // 创建复杂的批量操作
    const operations = OperationBuilder.combine(
      OperationBuilder.setRecordField('name', '新名称'),
      OperationBuilder.setRecordField('email', 'new@example.com'),
      OperationBuilder.setRecordField('age', 30),
      OperationBuilder.setNestedProperty(['metadata', 'lastLogin'], new Date().toISOString()),
      OperationBuilder.insertArrayElement(['tags'], 0, 'updated')
    );

    // 2. 直接使用 ShareDB 客户端提交复杂操作
    const sharedbClient = client.getShareDBClient();
    if (sharedbClient) {
      await sharedbClient.submit('record_table_123', 'record_456', operations);
      console.log('✅ 复杂操作提交成功');
    }

    // 3. 条件操作
    const conditionalOps = OperationBuilder.conditional(
      true,
      OperationBuilder.setRecordField('status', 'active'),
      OperationBuilder.setRecordField('status', 'inactive')
    );

    if (sharedbClient) {
      await sharedbClient.submit('record_table_123', 'record_456', conditionalOps);
      console.log('✅ 条件操作提交成功');
    }
  } catch (error) {
    console.error('❌ 高级示例错误:', error);
  }
}

// 错误处理示例
async function errorHandlingExample() {
  try {
    // 1. 检查 ShareDB 可用性
    if (!client.isShareDBAvailable()) {
      console.log('⚠️ ShareDB 不可用，使用传统 HTTP API');
      // 回退到传统 API
      await client.updateRecord('table_123', 'record_456', {
        data: { name: '传统更新' },
      });
      return;
    }

    // 2. 检查连接状态
    const connectionState = client.getShareDBConnectionState();
    if (connectionState !== 'connected') {
      console.log('⚠️ ShareDB 未连接，等待连接...');
      // 等待连接或使用传统 API
      return;
    }

    // 3. 使用 try-catch 处理操作错误
    try {
      await client.updateRecordFieldRealtime('table_123', 'record_456', 'name', '新名称');
    } catch (error) {
      console.error('❌ 实时更新失败，回退到传统 API:', error);
      // 回退到传统 API
      await client.updateRecord('table_123', 'record_456', {
        data: { name: '新名称' },
      });
    }
  } catch (error) {
    console.error('❌ 错误处理示例错误:', error);
  }
}

// 运行示例
if (require.main === module) {
  console.log('🚀 开始 ShareDB 示例...');

  shareDBExample()
    .then(() => {
      console.log('✅ ShareDB 基础示例完成');
      return advancedShareDBExample();
    })
    .then(() => {
      console.log('✅ ShareDB 高级示例完成');
      return errorHandlingExample();
    })
    .then(() => {
      console.log('✅ ShareDB 错误处理示例完成');
      console.log('🎉 所有示例完成！');
    })
    .catch((error) => {
      console.error('❌ 示例执行失败:', error);
    });
}

export { shareDBExample, advancedShareDBExample, errorHandlingExample };
