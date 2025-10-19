/**
 * WebSocket 数据格式快速验证测试
 * 使用现有表进行快速验证，不创建新资源
 */
import { initAndLogin, cleanup, log, error, separator } from './common';

async function testWebSocketFormatQuick() {
  separator('WebSocket 数据格式快速验证');

  // 使用用户提供的现有表
  const existingTableId = 'tbl_6wDmC8NvlsAYZXcBa2XWQ';
  const existingBaseId = '7ec1e878-91b9-4c1b-ad86-05cdf801318f';
  const existingSpaceId = 'spc_rtpLk96gJHLeYTv7JJMlo';

  // 验证统计
  let totalEvents = 0;
  let validEvents = 0;
  let invalidEvents = 0;
  const eventTypes = new Set<string>();
  const errors: string[] = [];

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

    // 2. 获取现有表信息
    log('\n2. 获取现有表信息');
    const table = await sdk.getTable(existingTableId);
    log('表信息:', {
      id: table.id,
      name: table.name,
    });

    // 3. 获取现有字段
    const fields = await sdk.listFields({ tableId: existingTableId });
    const titleField = fields.find((f) => f.name === '文本') || fields[0];
    const statusField = fields.find((f) => f.name === '单选') || fields[1];

    log('使用字段:', {
      titleField: titleField?.name,
      statusField: statusField?.name,
    });

    // 4. 设置格式验证监听器
    log('\n3. 设置格式验证监听器');

    // 验证消息格式的辅助函数
    function validateMessage(message: any): boolean {
      // 检查必需字段
      if (!message.type || !message.timestamp) {
        errors.push(`消息缺少必需字段: type=${message.type}, timestamp=${message.timestamp}`);
        return false;
      }

      // 检查时间戳格式
      if (isNaN(Date.parse(message.timestamp))) {
        errors.push(`时间戳格式无效: ${message.timestamp}`);
        return false;
      }

      // 检查数据字段存在
      if (message.data === undefined) {
        errors.push(`消息缺少 data 字段`);
        return false;
      }

      return true;
    }

    // 验证操作消息格式
    function validateOperation(message: any): boolean {
      if (message.type !== 'op') return true; // 非操作消息跳过

      const data = message.data;
      if (!data) {
        errors.push(`操作消息缺少 data 字段`);
        return false;
      }

      // 检查操作类型
      if (!data.type) {
        errors.push(`操作消息缺少 type 字段`);
        return false;
      }

      // 检查表ID（可能在 data.table_id 或 message.collection 中）
      if (!data.table_id && !message.collection) {
        errors.push(`操作消息缺少表ID信息`);
        return false;
      }

      return true;
    }

    // 监听记录变更事件
    sdk.onRecordChange((message) => {
      totalEvents++;
      eventTypes.add('record_change');

      const isValid = validateMessage(message) && validateOperation(message);
      if (isValid) {
        validEvents++;
        log('✅ 记录变更事件格式正确:', {
          type: message.type,
          collection: message.collection,
          document: message.document,
          operationType: message.data?.type,
          tableId: message.data?.table_id || message.collection,
          timestamp: message.timestamp,
        });
      } else {
        invalidEvents++;
        log('❌ 记录变更事件格式错误:', {
          type: message.type,
          data: message.data,
          errors: errors.slice(-3), // 显示最近的3个错误
        });
      }
    });

    // 监听协作事件
    sdk.onCollaboration((message) => {
      totalEvents++;
      eventTypes.add('collaboration');

      const isValid = validateMessage(message);
      if (isValid) {
        validEvents++;
        log('✅ 协作事件格式正确:', {
          type: message.type,
          action: message.data?.action,
          resourceType: message.data?.resource_type,
          resourceId: message.data?.resource_id,
        });
      } else {
        invalidEvents++;
        log('❌ 协作事件格式错误:', message);
      }
    });

    // 监听在线状态更新
    sdk.onPresenceUpdate((message) => {
      totalEvents++;
      eventTypes.add('presence_update');

      const isValid = validateMessage(message);
      if (isValid) {
        validEvents++;
        log('✅ 在线状态更新格式正确:', {
          type: message.type,
          userId: message.data?.user_id,
          resourceType: message.data?.resource_type,
        });
      } else {
        invalidEvents++;
        log('❌ 在线状态更新格式错误:', message);
      }
    });

    // 监听通知事件
    sdk.onNotification((message) => {
      totalEvents++;
      eventTypes.add('notification');

      const isValid = validateMessage(message);
      if (isValid) {
        validEvents++;
        log('✅ 通知事件格式正确:', {
          type: message.type,
          notificationType: message.data?.type,
          title: message.data?.title,
        });
      } else {
        invalidEvents++;
        log('❌ 通知事件格式错误:', message);
      }
    });

    // 4. 订阅表格
    log('\n4. 订阅表格');
    sdk.subscribeToTable(table.id);
    log('✅ 已订阅表格:', table.id);

    // 等待订阅生效
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 5. 创建测试记录
    log('\n5. 创建测试记录');
    const record = await sdk.createRecord({
      tableId: table.id,
      data: {
        [titleField.name]: '格式验证测试记录',
        [statusField.name]: '选项1',
      },
    });

    log('记录创建成功:', {
      id: record.id,
      data: record.data,
    });

    // 等待 WebSocket 事件
    log('等待记录创建的 WebSocket 事件...');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 6. 更新记录
    log('\n6. 更新记录');
    const updatedRecord = await sdk.updateRecord(table.id, record.id, {
      [statusField.name]: 'doing',
    });

    log('记录更新成功:', {
      id: updatedRecord.id,
      version: updatedRecord.version,
    });

    // 等待 WebSocket 事件
    log('等待记录更新的 WebSocket 事件...');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 7. 订阅记录
    log('\n7. 订阅记录');
    sdk.subscribeToRecord(table.id, record.id);
    log('✅ 已订阅记录:', record.id);

    // 等待订阅生效
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 8. 再次更新记录
    log('\n8. 再次更新记录');
    const finalRecord = await sdk.updateRecord(table.id, record.id, {
      [statusField.name]: 'done',
    });

    log('记录最终更新成功:', {
      id: finalRecord.id,
      version: finalRecord.version,
    });

    // 等待 WebSocket 事件
    log('等待最终更新的 WebSocket 事件...');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 9. 清理测试记录
    log('\n9. 清理测试记录');
    await sdk.deleteRecord(table.id, record.id);
    log('测试记录已删除');

    // 等待删除 WebSocket 事件
    log('等待删除的 WebSocket 事件...');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 10. 生成验证报告
    log('\n10. 生成验证报告');
    generateQuickReport(totalEvents, validEvents, invalidEvents, eventTypes, errors);

    await cleanup();

    separator('✅ WebSocket 数据格式快速验证完成');
  } catch (err) {
    error('WebSocket 数据格式快速验证失败', err);

    // 尝试清理测试记录
    try {
      const { sdk } = await initAndLogin();
      log('尝试清理测试记录...');
    } catch (cleanupErr) {
      error('清理测试数据失败', cleanupErr);
    }

    await cleanup();
    throw err;
  }
}

/**
 * 生成快速验证报告
 */
function generateQuickReport(
  totalEvents: number,
  validEvents: number,
  invalidEvents: number,
  eventTypes: Set<string>,
  errors: string[]
) {
  separator('📊 快速验证报告');

  // 1. 基本统计
  log('1. 基本统计:');
  log(`   总事件数: ${totalEvents}`);
  log(`   有效事件数: ${validEvents}`);
  log(`   无效事件数: ${invalidEvents}`);
  log(`   事件类型: ${Array.from(eventTypes).join(', ')}`);

  // 2. 格式正确率
  const successRate = totalEvents > 0 ? ((validEvents / totalEvents) * 100).toFixed(2) : '0.00';
  log(`\n2. 格式正确率: ${successRate}%`);

  // 3. 兼容性评估
  log('\n3. 兼容性评估:');
  if (totalEvents === 0) {
    log('   ⚠️  警告: 没有收到任何 WebSocket 事件');
    log('   可能原因:');
    log('     - WebSocket 连接未成功建立');
    log('     - 服务器端未发送 WebSocket 事件');
    log('     - 订阅设置有问题');
  } else if (invalidEvents === 0) {
    log('   ✅ 优秀: 所有事件格式都正确');
  } else if (invalidEvents <= totalEvents * 0.1) {
    log('   ✅ 良好: 大部分事件格式正确');
  } else if (invalidEvents <= totalEvents * 0.3) {
    log('   ⚠️  一般: 部分事件格式有问题');
  } else {
    log('   ❌ 较差: 大部分事件格式有问题');
  }

  // 4. 错误详情
  if (errors.length > 0) {
    log('\n4. 错误详情:');
    errors.slice(0, 10).forEach((error, index) => {
      log(`   ${index + 1}. ${error}`);
    });
    if (errors.length > 10) {
      log(`   ... 还有 ${errors.length - 10} 个错误`);
    }
  } else {
    log('\n4. 错误详情: 无错误');
  }

  // 5. 建议
  log('\n5. 建议:');
  if (totalEvents === 0) {
    log('   - 检查 WebSocket 连接状态');
    log('   - 确认服务器端 WebSocket 功能正常');
    log('   - 检查订阅设置');
  } else if (invalidEvents > 0) {
    log('   - 检查消息格式验证逻辑');
    log('   - 确认服务端消息格式符合预期');
    log('   - 增强错误处理机制');
  } else {
    log('   - ✅ SDK 与服务端数据格式完全兼容');
    log('   - 可以继续使用 WebSocket 功能');
  }
}

// 运行测试
testWebSocketFormatQuick()
  .then(() => {
    console.log('\n✅ 快速验证测试完成');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ 快速验证测试失败:', err);
    process.exit(1);
  });
