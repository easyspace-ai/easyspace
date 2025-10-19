/**
 * WebSocket 消息格式兼容性测试
 * 专门测试 SDK 对各种消息格式的处理能力
 */
import { initAndLogin, cleanup, log, error, separator } from './common/index';

// 消息格式测试结果
interface MessageFormatTestResult {
  messageType: string;
  expectedFormat: string;
  actualFormat: string;
  isCompatible: boolean;
  details: any;
  timestamp: string;
}

// 操作格式测试结果
interface OperationFormatTestResult {
  operationType: string;
  dataStructure: 'ShareDB' | 'Custom' | 'Unknown';
  hasRequiredFields: boolean;
  isCompatible: boolean;
  details: any;
}

async function testWebSocketMessageFormats() {
  separator('WebSocket 消息格式兼容性测试');

  // 使用现有表进行测试
  const existingTableId = 'tbl_6wDmC8NvlsAYZXcBa2XWQ';

  // 测试结果收集
  const messageFormatResults: MessageFormatTestResult[] = [];
  const operationFormatResults: OperationFormatTestResult[] = [];
  let totalMessages = 0;
  let compatibleMessages = 0;

  try {
    const { sdk } = await initAndLogin();

    // 1. 检查 WebSocket 连接
    log('1. 检查 WebSocket 连接状态');
    const wsState = sdk.getWebSocketState();
    log('WebSocket 状态:', wsState);

    if (wsState === 'disconnected') {
      log('尝试连接 WebSocket...');
      await sdk.connectWebSocket();
      log('WebSocket 连接状态:', sdk.getWebSocketState());
    }

    // 2. 获取表信息
    log('\n2. 获取表信息');
    const table = await sdk.getTable(existingTableId);
    const fields = await sdk.listFields({ tableId: existingTableId });
    const titleField = fields.find((f) => f.name === '文本') || fields[0];
    const statusField = fields.find((f) => f.name === '单选') || fields[1];

    log('测试环境:', {
      tableId: table.id,
      tableName: table.name,
      titleField: titleField?.name,
      statusField: statusField?.name,
    });

    // 3. 设置消息格式测试监听器
    log('\n3. 设置消息格式测试监听器');

    // 测试基础消息格式
    function testBasicMessageFormat(message: any): MessageFormatTestResult {
      const result: MessageFormatTestResult = {
        messageType: message.type || 'unknown',
        expectedFormat: 'WebSocketMessage',
        actualFormat: 'unknown',
        isCompatible: false,
        details: {},
        timestamp: new Date().toISOString(),
      };

      // 检查必需字段
      const hasType = !!message.type;
      const hasTimestamp = !!message.timestamp;
      const hasData = message.data !== undefined;

      result.details = {
        hasType,
        hasTimestamp,
        hasData,
        hasId: !!message.id,
        hasCollection: !!message.collection,
        hasDocument: !!message.document,
        hasError: !!message.error,
        timestampValid: hasTimestamp ? !isNaN(Date.parse(message.timestamp)) : false,
      };

      // 判断格式类型
      if (hasType && hasTimestamp && hasData) {
        result.actualFormat = 'WebSocketMessage';
        result.isCompatible = true;
      } else if (hasType && hasTimestamp) {
        result.actualFormat = 'BasicMessage';
        result.isCompatible = true;
      } else {
        result.actualFormat = 'InvalidMessage';
        result.isCompatible = false;
      }

      return result;
    }

    // 测试操作消息格式
    function testOperationFormat(message: any): OperationFormatTestResult | null {
      if (message.type !== 'op' || !message.data) {
        return null;
      }

      const data = message.data;
      const result: OperationFormatTestResult = {
        operationType: data.type || 'unknown',
        dataStructure: 'Unknown',
        hasRequiredFields: false,
        isCompatible: false,
        details: {},
      };

      // 检查 ShareDB 格式
      if (data.op && Array.isArray(data.op)) {
        result.dataStructure = 'ShareDB';
        result.details = {
          hasOp: true,
          opLength: data.op.length,
          hasSource: !!data.source,
          firstOp: data.op[0] || null,
        };
        result.hasRequiredFields = data.op.length > 0;
        result.isCompatible = true;
      }
      // 检查自定义格式
      else if (data.type && (data.table_id || message.collection)) {
        result.dataStructure = 'Custom';
        result.details = {
          hasType: true,
          hasTableId: !!data.table_id,
          hasTimestamp: !!data.timestamp,
          hasUserId: !!data.user_id,
          hasWindowId: !!data.window_id,
          hasData: !!data.data,
        };
        result.hasRequiredFields = !!(data.type && (data.table_id || message.collection));
        result.isCompatible = result.hasRequiredFields;
      }

      return result;
    }

    // 监听记录变更事件
    sdk.onRecordChange((message) => {
      totalMessages++;
      const messageResult = testBasicMessageFormat(message);
      messageFormatResults.push(messageResult);

      const operationResult = testOperationFormat(message);
      if (operationResult) {
        operationFormatResults.push(operationResult);
      }

      if (messageResult.isCompatible) {
        compatibleMessages++;
        log('✅ 记录变更消息格式兼容:', {
          type: messageResult.messageType,
          format: messageResult.actualFormat,
          operationType: operationResult?.operationType,
          dataStructure: operationResult?.dataStructure,
        });
      } else {
        log('❌ 记录变更消息格式不兼容:', {
          type: messageResult.messageType,
          format: messageResult.actualFormat,
          details: messageResult.details,
        });
      }
    });

    // 监听协作事件
    sdk.onCollaboration((message) => {
      totalMessages++;
      const messageResult = testBasicMessageFormat(message);
      messageFormatResults.push(messageResult);

      if (messageResult.isCompatible) {
        compatibleMessages++;
        log('✅ 协作消息格式兼容:', {
          type: messageResult.messageType,
          format: messageResult.actualFormat,
          action: message.data?.action,
        });
      } else {
        log('❌ 协作消息格式不兼容:', {
          type: messageResult.messageType,
          format: messageResult.actualFormat,
          details: messageResult.details,
        });
      }
    });

    // 监听在线状态更新
    sdk.onPresenceUpdate((message) => {
      totalMessages++;
      const messageResult = testBasicMessageFormat(message);
      messageFormatResults.push(messageResult);

      if (messageResult.isCompatible) {
        compatibleMessages++;
        log('✅ 在线状态消息格式兼容:', {
          type: messageResult.messageType,
          format: messageResult.actualFormat,
          userId: message.data?.user_id,
        });
      } else {
        log('❌ 在线状态消息格式不兼容:', {
          type: messageResult.messageType,
          format: messageResult.actualFormat,
          details: messageResult.details,
        });
      }
    });

    // 监听通知事件
    sdk.onNotification((message) => {
      totalMessages++;
      const messageResult = testBasicMessageFormat(message);
      messageFormatResults.push(messageResult);

      if (messageResult.isCompatible) {
        compatibleMessages++;
        log('✅ 通知消息格式兼容:', {
          type: messageResult.messageType,
          format: messageResult.actualFormat,
          notificationType: message.data?.type,
        });
      } else {
        log('❌ 通知消息格式不兼容:', {
          type: messageResult.messageType,
          format: messageResult.actualFormat,
          details: messageResult.details,
        });
      }
    });

    // 4. 订阅表格
    log('\n4. 订阅表格');
    sdk.subscribeToTable(table.id);
    log('✅ 已订阅表格:', table.id);

    // 等待订阅生效
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 5. 执行各种操作以触发不同类型的消息
    log('\n5. 执行操作以触发消息');

    // 5.1 创建记录
    log('5.1 创建记录');
    const record = await sdk.createRecord({
      tableId: table.id,
      data: {
        [titleField.name]: '消息格式测试记录',
        [statusField.name]: '选项1',
      },
    });
    log('记录创建成功:', record.id);

    // 等待消息
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 5.2 更新记录
    log('5.2 更新记录');
    const updatedRecord = await sdk.updateRecord(table.id, record.id, {
      [statusField.name]: 'doing',
    });
    log('记录更新成功:', updatedRecord.id);

    // 等待消息
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 5.3 订阅记录
    log('5.3 订阅记录');
    sdk.subscribeToRecord(table.id, record.id);
    log('✅ 已订阅记录:', record.id);

    // 等待订阅确认
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 5.4 再次更新记录
    log('5.4 再次更新记录');
    const finalRecord = await sdk.updateRecord(table.id, record.id, {
      [statusField.name]: 'done',
    });
    log('记录最终更新成功:', finalRecord.id);

    // 等待消息
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 5.5 批量操作
    log('5.5 批量创建记录');
    const batchRecords = await sdk.bulkCreateRecords(table.id, [
      {
        [titleField.name]: '批量记录 1',
        [statusField.name]: 'todo',
      },
      {
        [titleField.name]: '批量记录 2',
        [statusField.name]: 'doing',
      },
    ]);
    log('批量创建成功:', batchRecords.length, '条记录');

    // 等待消息
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 5.6 删除记录
    log('5.6 删除记录');
    await sdk.deleteRecord(table.id, record.id);
    log('记录删除成功:', record.id);

    // 等待消息
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 6. 生成详细的兼容性报告
    log('\n6. 生成兼容性报告');
    generateCompatibilityReport(
      totalMessages,
      compatibleMessages,
      messageFormatResults,
      operationFormatResults
    );

    await cleanup();

    separator('✅ WebSocket 消息格式兼容性测试完成');
  } catch (err) {
    error('WebSocket 消息格式兼容性测试失败', err);

    // 尝试清理
    try {
      const { sdk } = await initAndLogin();
      log('尝试清理测试数据...');
    } catch (cleanupErr) {
      error('清理失败', cleanupErr);
    }

    await cleanup();
    throw err;
  }
}

/**
 * 生成兼容性报告
 */
function generateCompatibilityReport(
  totalMessages: number,
  compatibleMessages: number,
  messageFormatResults: MessageFormatTestResult[],
  operationFormatResults: OperationFormatTestResult[]
) {
  separator('📊 消息格式兼容性报告');

  // 1. 总体统计
  log('1. 总体统计:');
  log(`   总消息数: ${totalMessages}`);
  log(`   兼容消息数: ${compatibleMessages}`);
  log(`   不兼容消息数: ${totalMessages - compatibleMessages}`);
  const compatibilityRate =
    totalMessages > 0 ? ((compatibleMessages / totalMessages) * 100).toFixed(2) : '0.00';
  log(`   兼容率: ${compatibilityRate}%`);

  // 2. 消息类型分析
  log('\n2. 消息类型分析:');
  const messageTypeStats = new Map<string, { total: number; compatible: number }>();

  messageFormatResults.forEach((result) => {
    const stats = messageTypeStats.get(result.messageType) || { total: 0, compatible: 0 };
    stats.total++;
    if (result.isCompatible) stats.compatible++;
    messageTypeStats.set(result.messageType, stats);
  });

  for (const [type, stats] of messageTypeStats.entries()) {
    const rate = stats.total > 0 ? ((stats.compatible / stats.total) * 100).toFixed(2) : '0.00';
    log(`   ${type}: ${stats.compatible}/${stats.total} (${rate}%)`);
  }

  // 3. 消息格式分析
  log('\n3. 消息格式分析:');
  const formatStats = new Map<string, number>();

  messageFormatResults.forEach((result) => {
    const count = formatStats.get(result.actualFormat) || 0;
    formatStats.set(result.actualFormat, count + 1);
  });

  for (const [format, count] of formatStats.entries()) {
    log(`   ${format}: ${count} 条`);
  }

  // 4. 操作格式分析
  if (operationFormatResults.length > 0) {
    log('\n4. 操作格式分析:');
    const operationTypeStats = new Map<string, { total: number; compatible: number }>();
    const dataStructureStats = new Map<string, number>();

    operationFormatResults.forEach((result) => {
      // 操作类型统计
      const stats = operationTypeStats.get(result.operationType) || { total: 0, compatible: 0 };
      stats.total++;
      if (result.isCompatible) stats.compatible++;
      operationTypeStats.set(result.operationType, stats);

      // 数据结构统计
      const count = dataStructureStats.get(result.dataStructure) || 0;
      dataStructureStats.set(result.dataStructure, count + 1);
    });

    log('   操作类型:');
    for (const [type, stats] of operationTypeStats.entries()) {
      const rate = stats.total > 0 ? ((stats.compatible / stats.total) * 100).toFixed(2) : '0.00';
      log(`     ${type}: ${stats.compatible}/${stats.total} (${rate}%)`);
    }

    log('   数据结构:');
    for (const [structure, count] of dataStructureStats.entries()) {
      log(`     ${structure}: ${count} 条`);
    }
  }

  // 5. 兼容性评估
  log('\n5. 兼容性评估:');
  if (totalMessages === 0) {
    log('   ⚠️  警告: 没有收到任何消息');
    log('   建议: 检查 WebSocket 连接和订阅设置');
  } else if (compatibleMessages === totalMessages) {
    log('   ✅ 优秀: 所有消息格式都兼容');
    log('   结论: SDK 与服务端消息格式完全兼容');
  } else if (compatibleMessages >= totalMessages * 0.9) {
    log('   ✅ 良好: 大部分消息格式兼容');
    log('   结论: SDK 与服务端消息格式基本兼容');
  } else if (compatibleMessages >= totalMessages * 0.7) {
    log('   ⚠️  一般: 部分消息格式不兼容');
    log('   结论: SDK 与服务端消息格式存在部分兼容性问题');
  } else {
    log('   ❌ 较差: 大部分消息格式不兼容');
    log('   结论: SDK 与服务端消息格式存在严重兼容性问题');
  }

  // 6. 详细问题分析
  const incompatibleMessages = messageFormatResults.filter((r) => !r.isCompatible);
  if (incompatibleMessages.length > 0) {
    log('\n6. 不兼容消息详情:');
    incompatibleMessages.slice(0, 5).forEach((msg, index) => {
      log(`   ${index + 1}. ${msg.messageType} (${msg.actualFormat})`);
      log(`      缺少字段: ${JSON.stringify(msg.details)}`);
    });
    if (incompatibleMessages.length > 5) {
      log(`   ... 还有 ${incompatibleMessages.length - 5} 条不兼容消息`);
    }
  }

  // 7. 改进建议
  log('\n7. 改进建议:');
  if (totalMessages === 0) {
    log('   - 检查 WebSocket 连接状态');
    log('   - 确认服务器端 WebSocket 功能正常');
    log('   - 检查订阅设置是否正确');
  } else if (compatibleMessages < totalMessages) {
    log('   - 检查消息格式验证逻辑');
    log('   - 确认服务端消息格式符合预期');
    log('   - 增强错误处理机制');
    log('   - 考虑添加更多格式支持');
  } else {
    log('   - ✅ 当前实现已经很好');
    log('   - 可以继续使用 WebSocket 功能');
    log('   - 考虑添加更多消息类型支持');
  }
}

// 运行测试
testWebSocketMessageFormats()
  .then(() => {
    console.log('\n✅ 消息格式兼容性测试完成');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ 消息格式兼容性测试失败:', err);
    process.exit(1);
  });
