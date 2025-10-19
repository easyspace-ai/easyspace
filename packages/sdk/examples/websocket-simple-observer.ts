/**
 * WebSocket 简单观察器
 * 专门用于观察 WebSocket 事件，输出更清晰
 */
import { initAndLogin, cleanup, log, error, separator } from './common';

async function startSimpleObserver() {
  separator('WebSocket 简单观察器');

  // 使用用户提供的现有表
  const existingTableId = 'tbl_6wDmC8NvlsAYZXcBa2XWQ';
  const existingBaseId = '7ec1e878-91b9-4c1b-ad86-05cdf801318f';
  const existingSpaceId = 'spc_rtpLk96gJHLeYTv7JJMlo';

  // 统计信息
  let totalEvents = 0;
  const eventTypes = new Map<string, number>();
  const startTime = new Date();

  try {
    const { sdk } = await initAndLogin();

    // 1. 检查 WebSocket 连接
    log('🔌 检查 WebSocket 连接状态');
    const wsState = sdk.getWebSocketState();
    log('WebSocket 状态:', wsState);

    if (wsState === 'disconnected') {
      log('尝试连接 WebSocket...');
      await sdk.connectWebSocket();
      log('WebSocket 连接状态:', sdk.getWebSocketState());
    }

    // 2. 获取现有表信息
    log('\n📋 获取现有表信息');
    const table = await sdk.getTable(existingTableId);
    log('表信息:', {
      id: table.id,
      name: table.name,
    });

    // 3. 设置事件监听器
    log('\n👂 设置事件监听器');

    // 监听记录变更事件
    sdk.onRecordChange((message) => {
      totalEvents++;
      const eventType = 'record_change';
      eventTypes.set(eventType, (eventTypes.get(eventType) || 0) + 1);

      console.log('\n' + '='.repeat(80));
      console.log(`📝 [${new Date().toLocaleTimeString()}] 记录变更事件 #${totalEvents}`);
      console.log('='.repeat(80));
      console.log('类型:', message.type);
      console.log('集合:', message.collection);
      console.log('文档:', message.document);
      console.log('时间戳:', message.timestamp);
      console.log('\n数据详情:');
      console.log(JSON.stringify(message.data, null, 2));

      // 如果是操作消息，解析操作详情
      if (message.type === 'op' && message.data?.op) {
        console.log('\n操作详情:');
        message.data.op.forEach((op: any, index: number) => {
          console.log(`  操作 ${index + 1}:`);
          console.log(`    路径: ${JSON.stringify(op.p)}`);
          console.log(`    记录ID: ${op.recordId}`);
          if (op.oi) {
            console.log(`    插入数据: ${JSON.stringify(op.oi, null, 4)}`);
          }
          if (op.od) {
            console.log(`    删除数据: ${JSON.stringify(op.od, null, 4)}`);
          }
          if (op.li !== undefined) {
            console.log(`    列表插入: ${op.li}`);
          }
          if (op.ld !== undefined) {
            console.log(`    列表删除: ${op.ld}`);
          }
        });
      }
    });

    // 监听协作事件
    sdk.onCollaboration((message) => {
      totalEvents++;
      const eventType = 'collaboration';
      eventTypes.set(eventType, (eventTypes.get(eventType) || 0) + 1);

      console.log('\n' + '='.repeat(80));
      console.log(`🤝 [${new Date().toLocaleTimeString()}] 协作事件 #${totalEvents}`);
      console.log('='.repeat(80));
      console.log('类型:', message.type);
      console.log('时间戳:', message.timestamp);
      console.log('\n数据详情:');
      console.log(JSON.stringify(message.data, null, 2));
    });

    // 监听在线状态更新
    sdk.onPresenceUpdate((message) => {
      totalEvents++;
      const eventType = 'presence_update';
      eventTypes.set(eventType, (eventTypes.get(eventType) || 0) + 1);

      console.log('\n' + '='.repeat(80));
      console.log(`👤 [${new Date().toLocaleTimeString()}] 在线状态更新 #${totalEvents}`);
      console.log('='.repeat(80));
      console.log('类型:', message.type);
      console.log('时间戳:', message.timestamp);
      console.log('\n数据详情:');
      console.log(JSON.stringify(message.data, null, 2));
    });

    // 监听光标更新
    sdk.onCursorUpdate((message) => {
      totalEvents++;
      const eventType = 'cursor_update';
      eventTypes.set(eventType, (eventTypes.get(eventType) || 0) + 1);

      console.log('\n' + '='.repeat(80));
      console.log(`🖱️  [${new Date().toLocaleTimeString()}] 光标更新 #${totalEvents}`);
      console.log('='.repeat(80));
      console.log('类型:', message.type);
      console.log('时间戳:', message.timestamp);
      console.log('\n数据详情:');
      console.log(JSON.stringify(message.data, null, 2));
    });

    // 监听通知事件
    sdk.onNotification((message) => {
      totalEvents++;
      const eventType = 'notification';
      eventTypes.set(eventType, (eventTypes.get(eventType) || 0) + 1);

      console.log('\n' + '='.repeat(80));
      console.log(`🔔 [${new Date().toLocaleTimeString()}] 通知事件 #${totalEvents}`);
      console.log('='.repeat(80));
      console.log('类型:', message.type);
      console.log('时间戳:', message.timestamp);
      console.log('\n数据详情:');
      console.log(JSON.stringify(message.data, null, 2));
    });

    // 4. 订阅表格
    log('\n📡 订阅表格');
    sdk.subscribeToTable(table.id);
    log('✅ 已订阅表格:', table.id);

    // 等待订阅生效
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 5. 显示监听状态
    log('\n🎧 简单观察器已启动');
    log('============================================================');
    log('📊 统计信息:');
    log('  开始时间:', startTime.toLocaleString());
    log('  监听表ID:', table.id);
    log('');
    log('💡 提示:');
    log('  - 现在可以在另一个终端中运行事件触发器');
    log('  - 所有 WebSocket 事件都会实时显示在这里');
    log('  - 按 Ctrl+C 停止监听');
    log('============================================================');

    // 6. 定期显示统计信息
    const statsInterval = setInterval(() => {
      const now = new Date();
      const duration = Math.floor((now.getTime() - startTime.getTime()) / 1000);

      console.log(`\n📈 [${now.toLocaleTimeString()}] 统计信息 (运行 ${duration}s):`);
      console.log('  总事件数:', totalEvents);
      console.log('  事件类型分布:');
      for (const [type, count] of eventTypes.entries()) {
        console.log(`    ${type}: ${count}`);
      }
      console.log('  WebSocket 状态:', sdk.getWebSocketState());
    }, 30000); // 每30秒显示一次统计

    // 7. 处理退出信号
    process.on('SIGINT', async () => {
      console.log('\n\n🛑 收到退出信号，正在停止观察器...');
      clearInterval(statsInterval);

      // 显示最终统计
      const endTime = new Date();
      const totalDuration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

      console.log('\n📊 最终统计:');
      console.log('  开始时间:', startTime.toLocaleString());
      console.log('  结束时间:', endTime.toLocaleString());
      console.log('  总运行时间:', `${totalDuration}秒`);
      console.log('  总事件数:', totalEvents);
      console.log('  事件类型分布:');
      for (const [type, count] of eventTypes.entries()) {
        console.log(`    ${type}: ${count}`);
      }

      await cleanup();
      console.log('\n✅ 观察器已停止');
      process.exit(0);
    });

    // 8. 保持程序运行
    console.log('\n⏳ 观察器正在运行，等待事件...');

    // 创建一个永不结束的 Promise
    await new Promise(() => {});
  } catch (err) {
    error('WebSocket 观察器启动失败', err);
    await cleanup();
    throw err;
  }
}

// 运行观察器
startSimpleObserver()
  .then(() => {
    console.log('\n✅ 观察器正常退出');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ 观察器异常退出:', err);
    process.exit(1);
  });
