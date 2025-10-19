/**
 * WebSocket 数据格式验证测试
 * 专门验证 SDK 对服务端 WebSocket 数据格式的处理能力
 * 测试各种消息类型、操作格式、事件处理等
 */
import { initAndLogin, cleanup, log, error, separator, randomName } from './common/index';

// 消息格式验证接口
interface MessageFormatValidation {
  type: string;
  hasRequiredFields: boolean;
  hasValidTimestamp: boolean;
  hasValidData: boolean;
  collection?: string;
  document?: string;
  error?: any;
}

// 操作消息验证接口
interface OperationValidation {
  operationType: string;
  hasTableId: boolean;
  hasTimestamp: boolean;
  hasUserData: boolean;
  dataStructure: 'ShareDB' | 'Custom' | 'Unknown';
  isValid: boolean;
}

// 事件统计
interface EventStats {
  totalEvents: number;
  eventTypes: Map<string, number>;
  messageFormats: MessageFormatValidation[];
  operationValidations: OperationValidation[];
  errors: string[];
}

async function testWebSocketDataFormatValidation() {
  separator('WebSocket 数据格式验证测试');

  let createdSpaceId: string | null = null;
  let createdBaseId: string | null = null;
  let createdTableId: string | null = null;
  let createdRecordId: string | null = null;

  // 初始化事件统计
  const stats: EventStats = {
    totalEvents: 0,
    eventTypes: new Map(),
    messageFormats: [],
    operationValidations: [],
    errors: [],
  };

  try {
    const { sdk } = await initAndLogin();

    // 1. 检查 WebSocket 连接状态
    log('1. 检查 WebSocket 连接状态');
    const wsState = sdk.getWebSocketState();
    log('WebSocket 状态:', wsState);

    if (wsState === 'disconnected') {
      log('尝试连接 WebSocket...');
      await sdk.connectWebSocket();
      log('WebSocket 连接状态:', sdk.getWebSocketState());
    }

    // 2. 准备测试环境
    log('\n2. 准备测试环境');
    const space = await sdk.createSpace({
      name: randomName('数据格式验证Space'),
    });
    createdSpaceId = space.id;

    const base = await sdk.createBase({
      spaceId: space.id,
      name: randomName('数据格式验证Base'),
    });
    createdBaseId = base.id;

    const table = await sdk.createTable({
      baseId: base.id,
      name: randomName('数据格式验证Table'),
    });
    createdTableId = table.id;

    log('测试环境准备完成', {
      spaceId: space.id,
      baseId: base.id,
      tableId: table.id,
    });

    // 3. 创建测试字段
    log('\n3. 创建测试字段');
    const titleField = await sdk.createField({
      tableId: table.id,
      name: '标题',
      type: 'singleLineText',
      required: true,
    });

    const statusField = await sdk.createField({
      tableId: table.id,
      name: '状态',
      type: 'singleSelect',
      options: {
        choices: [
          { id: 'todo', name: '待办' },
          { id: 'doing', name: '进行中' },
          { id: 'done', name: '已完成' },
        ],
      },
    });

    log('字段创建完成:', {
      titleField: titleField.name,
      statusField: statusField.name,
    });

    // 4. 设置详细的消息格式验证监听器
    log('\n4. 设置消息格式验证监听器');

    // 验证基础消息格式
    function validateMessageFormat(message: any): MessageFormatValidation {
      const validation: MessageFormatValidation = {
        type: message.type || 'unknown',
        hasRequiredFields: !!(message.type && message.timestamp),
        hasValidTimestamp: !!(message.timestamp && !isNaN(Date.parse(message.timestamp))),
        hasValidData: !!(message.data !== undefined),
        collection: message.collection,
        document: message.document,
        error: message.error,
      };

      return validation;
    }

    // 验证操作消息格式
    function validateOperationFormat(message: any): OperationValidation | null {
      if (message.type !== 'op' || !message.data) {
        return null;
      }

      const data = message.data;
      let dataStructure: 'ShareDB' | 'Custom' | 'Unknown' = 'Unknown';

      // 检查是否为 ShareDB 格式
      if (data.op && Array.isArray(data.op)) {
        dataStructure = 'ShareDB';
      }
      // 检查是否为自定义格式
      else if (data.type && data.table_id) {
        dataStructure = 'Custom';
      }

      const validation: OperationValidation = {
        operationType: data.type || 'unknown',
        hasTableId: !!(data.table_id || message.collection),
        hasTimestamp: !!(data.timestamp || message.timestamp),
        hasUserData: !!(data.user_id || data.window_id),
        dataStructure,
        isValid: !!(data.type && (data.table_id || message.collection)),
      };

      return validation;
    }

    // 监听记录变更事件并验证格式
    sdk.onRecordChange((message) => {
      stats.totalEvents++;
      stats.eventTypes.set('record_change', (stats.eventTypes.get('record_change') || 0) + 1);

      const formatValidation = validateMessageFormat(message);
      stats.messageFormats.push(formatValidation);

      const operationValidation = validateOperationFormat(message);
      if (operationValidation) {
        stats.operationValidations.push(operationValidation);
      }

      log('📝 记录变更事件验证:', {
        messageType: message.type,
        hasRequiredFields: formatValidation.hasRequiredFields,
        hasValidTimestamp: formatValidation.hasValidTimestamp,
        hasValidData: formatValidation.hasValidData,
        collection: formatValidation.collection,
        document: formatValidation.document,
        operationType: operationValidation?.operationType,
        dataStructure: operationValidation?.dataStructure,
        isValid: operationValidation?.isValid,
        rawData: message.data,
      });

      // 检查格式错误
      if (!formatValidation.hasRequiredFields) {
        stats.errors.push(`记录变更事件缺少必需字段: ${JSON.stringify(message)}`);
      }
      if (!formatValidation.hasValidTimestamp) {
        stats.errors.push(`记录变更事件时间戳无效: ${message.timestamp}`);
      }
    });

    // 监听协作事件并验证格式
    sdk.onCollaboration((message) => {
      stats.totalEvents++;
      stats.eventTypes.set('collaboration', (stats.eventTypes.get('collaboration') || 0) + 1);

      const formatValidation = validateMessageFormat(message);
      stats.messageFormats.push(formatValidation);

      log('🤝 协作事件验证:', {
        messageType: message.type,
        hasRequiredFields: formatValidation.hasRequiredFields,
        hasValidTimestamp: formatValidation.hasValidTimestamp,
        hasValidData: formatValidation.hasValidData,
        action: message.data?.action,
        resourceType: message.data?.resource_type,
        resourceId: message.data?.resource_id,
      });
    });

    // 监听在线状态更新并验证格式
    sdk.onPresenceUpdate((message) => {
      stats.totalEvents++;
      stats.eventTypes.set('presence_update', (stats.eventTypes.get('presence_update') || 0) + 1);

      const formatValidation = validateMessageFormat(message);
      stats.messageFormats.push(formatValidation);

      log('👥 在线状态更新验证:', {
        messageType: message.type,
        hasRequiredFields: formatValidation.hasRequiredFields,
        hasValidTimestamp: formatValidation.hasValidTimestamp,
        hasValidData: formatValidation.hasValidData,
        userId: message.data?.user_id,
        resourceType: message.data?.resource_type,
        resourceId: message.data?.resource_id,
      });
    });

    // 监听通知事件并验证格式
    sdk.onNotification((message) => {
      stats.totalEvents++;
      stats.eventTypes.set('notification', (stats.eventTypes.get('notification') || 0) + 1);

      const formatValidation = validateMessageFormat(message);
      stats.messageFormats.push(formatValidation);

      log('🔔 通知事件验证:', {
        messageType: message.type,
        hasRequiredFields: formatValidation.hasRequiredFields,
        hasValidTimestamp: formatValidation.hasValidTimestamp,
        hasValidData: formatValidation.hasValidData,
        notificationType: message.data?.type,
        title: message.data?.title,
        message: message.data?.message,
      });
    });

    // 监听所有 WebSocket 消息（用于调试）
    sdk.collaboration.onMessage((message) => {
      log('🔍 原始 WebSocket 消息:', {
        type: message.type,
        id: message.id,
        collection: message.collection,
        document: message.document,
        timestamp: message.timestamp,
        hasData: !!message.data,
        hasError: !!message.error,
        dataKeys: message.data ? Object.keys(message.data) : [],
      });
    });

    // 5. 测试表格订阅
    log('\n5. 测试表格订阅');
    sdk.subscribeToTable(table.id);
    log('✅ 已订阅表格:', table.id);

    // 等待订阅生效
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 6. 测试记录创建（验证 ShareDB 格式）
    log('\n6. 测试记录创建（验证数据格式）');
    const record = await sdk.createRecord({
      tableId: table.id,
      data: {
        [titleField.name]: '数据格式验证记录',
        [statusField.name]: 'todo',
      },
    });
    createdRecordId = record.id;

    log('记录创建成功:', {
      id: record.id,
      data: record.data,
    });

    // 等待 WebSocket 事件
    log('等待记录创建的 WebSocket 事件...');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 7. 测试记录更新（验证自定义格式）
    log('\n7. 测试记录更新（验证数据格式）');
    const updatedRecord = await sdk.updateRecord(table.id, record.id, {
      [statusField.name]: 'doing',
    });

    log('记录更新成功:', {
      id: updatedRecord.id,
      version: updatedRecord.version,
      data: updatedRecord.data,
    });

    // 等待 WebSocket 事件
    log('等待记录更新的 WebSocket 事件...');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 8. 测试记录订阅
    log('\n8. 测试记录订阅');
    sdk.subscribeToRecord(table.id, record.id);
    log('✅ 已订阅记录:', record.id);

    // 等待订阅生效
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 9. 测试批量操作（验证批量事件格式）
    log('\n9. 测试批量操作（验证批量事件格式）');
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

    log('批量创建记录成功:', {
      count: batchRecords.length,
      recordIds: batchRecords.map((r) => r.id),
    });

    // 等待批量 WebSocket 事件
    log('等待批量创建的 WebSocket 事件...');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 10. 测试记录删除（验证删除事件格式）
    log('\n10. 测试记录删除（验证删除事件格式）');
    await sdk.deleteRecord(table.id, record.id);
    log('记录删除成功:', record.id);

    // 等待删除 WebSocket 事件
    log('等待删除的 WebSocket 事件...');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 11. 测试错误处理（发送无效订阅）
    log('\n11. 测试错误处理');
    try {
      // 尝试订阅不存在的表
      sdk.subscribeToTable('invalid_table_id');
      log('发送了无效订阅请求');
    } catch (err) {
      log('捕获到预期的错误:', err);
    }

    // 等待可能的错误事件
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 12. 生成详细的验证报告
    log('\n12. 生成数据格式验证报告');
    generateValidationReport(stats);

    // 13. 清理测试数据
    log('\n13. 清理测试数据');
    await sdk.deleteSpace(space.id);
    log('清理完成');

    createdTableId = null;
    createdBaseId = null;
    createdSpaceId = null;
    createdRecordId = null;

    await cleanup();

    separator('✅ WebSocket 数据格式验证测试完成');
  } catch (err) {
    error('WebSocket 数据格式验证测试失败', err);

    // 清理创建的资源
    try {
      if (createdRecordId && createdTableId) {
        await sdk.deleteRecord(createdTableId, createdRecordId);
      }
      if (createdTableId) {
        await sdk.deleteTable(createdTableId);
      }
      if (createdBaseId) {
        await sdk.deleteBase(createdBaseId);
      }
      if (createdSpaceId) {
        await sdk.deleteSpace(createdSpaceId);
      }
    } catch (cleanupErr) {
      error('清理测试数据失败', cleanupErr);
    }

    await cleanup();
    throw err;
  }
}

/**
 * 生成详细的验证报告
 */
function generateValidationReport(stats: EventStats) {
  separator('📊 数据格式验证报告');

  // 1. 事件统计
  log('1. 事件统计:');
  log(`   总事件数: ${stats.totalEvents}`);
  log('   事件类型分布:');
  for (const [type, count] of stats.eventTypes.entries()) {
    log(`     ${type}: ${count} 次`);
  }

  // 2. 消息格式验证结果
  log('\n2. 消息格式验证结果:');
  const totalMessages = stats.messageFormats.length;
  const validMessages = stats.messageFormats.filter(
    (m) => m.hasRequiredFields && m.hasValidTimestamp && m.hasValidData
  ).length;
  const invalidMessages = totalMessages - validMessages;

  log(`   总消息数: ${totalMessages}`);
  log(`   有效消息数: ${validMessages}`);
  log(`   无效消息数: ${invalidMessages}`);
  log(
    `   消息格式正确率: ${totalMessages > 0 ? ((validMessages / totalMessages) * 100).toFixed(2) : 0}%`
  );

  // 3. 操作消息验证结果
  log('\n3. 操作消息验证结果:');
  const totalOperations = stats.operationValidations.length;
  const validOperations = stats.operationValidations.filter((op) => op.isValid).length;
  const shareDBOperations = stats.operationValidations.filter(
    (op) => op.dataStructure === 'ShareDB'
  ).length;
  const customOperations = stats.operationValidations.filter(
    (op) => op.dataStructure === 'Custom'
  ).length;

  log(`   总操作数: ${totalOperations}`);
  log(`   有效操作数: ${validOperations}`);
  log(`   ShareDB 格式: ${shareDBOperations}`);
  log(`   自定义格式: ${customOperations}`);
  log(
    `   操作格式正确率: ${totalOperations > 0 ? ((validOperations / totalOperations) * 100).toFixed(2) : 0}%`
  );

  // 4. 详细格式分析
  log('\n4. 详细格式分析:');
  const messageTypes = new Map<string, number>();
  const operationTypes = new Map<string, number>();

  stats.messageFormats.forEach((msg) => {
    messageTypes.set(msg.type, (messageTypes.get(msg.type) || 0) + 1);
  });

  stats.operationValidations.forEach((op) => {
    operationTypes.set(op.operationType, (operationTypes.get(op.operationType) || 0) + 1);
  });

  log('   消息类型分布:');
  for (const [type, count] of messageTypes.entries()) {
    log(`     ${type}: ${count} 次`);
  }

  log('   操作类型分布:');
  for (const [type, count] of operationTypes.entries()) {
    log(`     ${type}: ${count} 次`);
  }

  // 5. 错误报告
  if (stats.errors.length > 0) {
    log('\n5. 错误报告:');
    stats.errors.forEach((error, index) => {
      log(`   错误 ${index + 1}: ${error}`);
    });
  } else {
    log('\n5. 错误报告: 无错误');
  }

  // 6. 兼容性评估
  log('\n6. 兼容性评估:');
  const compatibilityScore = calculateCompatibilityScore(stats);
  log(`   兼容性评分: ${compatibilityScore}/100`);

  if (compatibilityScore >= 90) {
    log('   ✅ 优秀: SDK 与服务端数据格式完全兼容');
  } else if (compatibilityScore >= 80) {
    log('   ✅ 良好: SDK 与服务端数据格式基本兼容');
  } else if (compatibilityScore >= 70) {
    log('   ⚠️  一般: SDK 与服务端数据格式部分兼容');
  } else {
    log('   ❌ 较差: SDK 与服务端数据格式存在兼容性问题');
  }

  // 7. 建议
  log('\n7. 改进建议:');
  if (invalidMessages > 0) {
    log('   - 检查消息格式验证逻辑');
    log('   - 确保所有必需字段都存在');
  }
  if (stats.errors.length > 0) {
    log('   - 修复检测到的格式错误');
    log('   - 增强错误处理机制');
  }
  if (shareDBOperations === 0 && customOperations > 0) {
    log('   - 考虑添加 ShareDB 格式支持');
  }
  if (customOperations === 0 && shareDBOperations > 0) {
    log('   - 考虑添加自定义格式支持');
  }
}

/**
 * 计算兼容性评分
 */
function calculateCompatibilityScore(stats: EventStats): number {
  let score = 0;
  let maxScore = 0;

  // 消息格式正确性 (40分)
  maxScore += 40;
  if (stats.messageFormats.length > 0) {
    const validMessages = stats.messageFormats.filter(
      (m) => m.hasRequiredFields && m.hasValidTimestamp && m.hasValidData
    ).length;
    score += (validMessages / stats.messageFormats.length) * 40;
  }

  // 操作格式正确性 (30分)
  maxScore += 30;
  if (stats.operationValidations.length > 0) {
    const validOperations = stats.operationValidations.filter((op) => op.isValid).length;
    score += (validOperations / stats.operationValidations.length) * 30;
  }

  // 事件接收完整性 (20分)
  maxScore += 20;
  if (stats.totalEvents > 0) {
    // 如果收到了事件，说明基本功能正常
    score += 20;
  }

  // 错误处理 (10分)
  maxScore += 10;
  if (stats.errors.length === 0) {
    score += 10;
  } else {
    // 根据错误数量扣分
    const errorPenalty = Math.min(stats.errors.length * 2, 10);
    score += Math.max(0, 10 - errorPenalty);
  }

  return Math.round((score / maxScore) * 100);
}

// 运行测试
testWebSocketDataFormatValidation()
  .then(() => {
    console.log('\n✅ 数据格式验证测试完成');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ 数据格式验证测试失败:', err);
    process.exit(1);
  });
