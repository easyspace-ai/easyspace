/**
 * WebSocket 实时监听器 - 增强版
 * 持续监听 WebSocket 事件，用于观察和调试
 * 支持多表监听、事件过滤、性能监控等功能
 */
import { initAndLogin, cleanup, log, error, separator } from './common';

// 配置选项
interface MonitorConfig {
  tableIds?: string[];
  enableEventFilter?: boolean;
  enablePerformanceMonitor?: boolean;
  statsInterval?: number;
  maxEventHistory?: number;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

// 事件统计
interface EventStats {
  total: number;
  byType: Map<string, number>;
  byTable: Map<string, number>;
  recentEvents: Array<{
    timestamp: Date;
    type: string;
    table: string;
    data: any;
  }>;
  performance: {
    avgProcessingTime: number;
    maxProcessingTime: number;
    minProcessingTime: number;
  };
}

// 全局状态
let monitorConfig: MonitorConfig = {
  tableIds: ['tbl_6wDmC8NvlsAYZXcBa2XWQ'], // 默认监听表
  enableEventFilter: true,
  enablePerformanceMonitor: true,
  statsInterval: 30000, // 30秒
  maxEventHistory: 100,
  logLevel: 'info',
};

let eventStats: EventStats = {
  total: 0,
  byType: new Map(),
  byTable: new Map(),
  recentEvents: [],
  performance: {
    avgProcessingTime: 0,
    maxProcessingTime: 0,
    minProcessingTime: Infinity,
  },
};

const startTime = new Date();
let isRunning = false;
let statsInterval: NodeJS.Timeout | null = null;

async function startWebSocketMonitor(config: MonitorConfig = {}) {
  // 合并配置
  monitorConfig = { ...monitorConfig, ...config };

  separator('WebSocket 实时监听器 - 增强版');
  log('🔧 配置信息:', monitorConfig);

  try {
    const { sdk } = await initAndLogin();
    isRunning = true;

    // 1. 环境检测
    log('1. 环境检测');
    const env = {
      isNode: typeof process !== 'undefined' && process.versions?.node,
      nodeVersion: process.versions?.node,
      platform: process.platform,
      memory: process.memoryUsage ? process.memoryUsage() : null,
    };
    log('运行环境:', env);

    // 2. 检查 WebSocket 连接
    log('\n2. 检查 WebSocket 连接状态');
    const wsState = sdk.getWebSocketState();
    log('WebSocket 状态:', wsState);

    if (wsState === 'disconnected') {
      log('尝试连接 WebSocket...');
      await sdk.connectWebSocket();
      log('WebSocket 连接状态:', sdk.getWebSocketState());
    }

    // 3. 获取监听表信息
    log('\n3. 获取监听表信息');
    const tables: any[] = [];
    for (const tableId of monitorConfig.tableIds!) {
      try {
        const table = await sdk.getTable(tableId);
        tables.push(table);
        log(`✅ 表 ${table.name} (${table.id})`);

        // 获取字段信息
        const fields = await sdk.listFields({ tableId });
        log(`   字段数量: ${fields.length}`);
        if (fields.length > 0) {
          log(
            `   主要字段: ${fields
              .slice(0, 3)
              .map((f) => f.name)
              .join(', ')}`
          );
        }
      } catch (err) {
        log(`❌ 无法获取表 ${tableId}:`, err);
      }
    }

    // 4. 设置事件处理函数
    log('\n4. 设置事件监听器');

    // 通用事件处理函数
    function handleEvent(eventType: string, message: any, icon: string) {
      const startTime = Date.now();

      // 更新统计
      eventStats.total++;
      eventStats.byType.set(eventType, (eventStats.byType.get(eventType) || 0) + 1);
      eventStats.byTable.set(
        message.document || 'unknown',
        (eventStats.byTable.get(message.document || 'unknown') || 0) + 1
      );

      // 添加到最近事件历史
      eventStats.recentEvents.push({
        timestamp: new Date(),
        type: eventType,
        table: message.document || 'unknown',
        data: message,
      });

      // 限制历史记录数量
      if (eventStats.recentEvents.length > monitorConfig.maxEventHistory!) {
        eventStats.recentEvents.shift();
      }

      // 性能监控
      if (monitorConfig.enablePerformanceMonitor) {
        const processingTime = Date.now() - startTime;
        eventStats.performance.maxProcessingTime = Math.max(
          eventStats.performance.maxProcessingTime,
          processingTime
        );
        eventStats.performance.minProcessingTime = Math.min(
          eventStats.performance.minProcessingTime,
          processingTime
        );
        eventStats.performance.avgProcessingTime =
          (eventStats.performance.avgProcessingTime * (eventStats.total - 1) + processingTime) /
          eventStats.total;
      }

      // 事件过滤
      if (monitorConfig.enableEventFilter && !shouldLogEvent(eventType, message)) {
        return;
      }

      // 记录事件
      const timestamp = new Date().toLocaleTimeString();
      log(`\n${icon} [${timestamp}] ${eventType} 事件 #${eventStats.total}:`);
      log('  类型:', message.type);
      log('  集合:', message.collection);
      log('  文档:', message.document);
      log('  时间戳:', message.timestamp);

      if (monitorConfig.logLevel === 'debug') {
        log('  完整数据:', JSON.stringify(message.data, null, 2));
      } else {
        log('  数据摘要:', getDataSummary(message.data));
      }

      if (monitorConfig.enablePerformanceMonitor) {
        log('  处理时间:', `${Date.now() - startTime}ms`);
      }
    }

    // 事件过滤函数
    function shouldLogEvent(eventType: string, message: any): boolean {
      // 可以根据需要添加过滤逻辑
      return true;
    }

    // 数据摘要函数
    function getDataSummary(data: any): string {
      if (!data) return 'null';
      if (typeof data === 'string')
        return data.length > 100 ? data.substring(0, 100) + '...' : data;
      if (typeof data === 'object') {
        const keys = Object.keys(data);
        return `{${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''}} (${keys.length} keys)`;
      }
      return String(data);
    }

    // 监听记录变更事件
    sdk.onRecordChange((message) => {
      handleEvent('record_change', message, '📝');
    });

    // 监听协作事件
    sdk.onCollaboration((message) => {
      handleEvent('collaboration', message, '🤝');
    });

    // 监听在线状态更新
    sdk.onPresenceUpdate((message) => {
      handleEvent('presence_update', message, '👤');
    });

    // 监听光标更新
    sdk.onCursorUpdate((message) => {
      handleEvent('cursor_update', message, '🖱️');
    });

    // 监听通知事件
    sdk.onNotification((message) => {
      handleEvent('notification', message, '🔔');
    });

    // 5. 订阅表格
    log('\n5. 订阅表格');
    for (const table of tables) {
      try {
        sdk.subscribeToTable(table.id);
        log(`✅ 已订阅表格: ${table.name} (${table.id})`);
      } catch (err) {
        log(`❌ 订阅表格失败: ${table.name} (${table.id})`, err);
      }
    }

    // 等待订阅生效
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 6. 显示监听状态
    log('\n6. 开始监听 WebSocket 事件');
    log('============================================================');
    log('🎧 实时监听器已启动 - 增强版');
    log('📊 配置信息:');
    log('  开始时间:', startTime.toLocaleString());
    log('  监听表数量:', tables.length);
    log('  监听表列表:', tables.map((t) => `${t.name} (${t.id})`).join(', '));
    log('  事件过滤:', monitorConfig.enableEventFilter ? '启用' : '禁用');
    log('  性能监控:', monitorConfig.enablePerformanceMonitor ? '启用' : '禁用');
    log('  日志级别:', monitorConfig.logLevel);
    log('  统计间隔:', `${monitorConfig.statsInterval! / 1000}秒`);
    log('');
    log('💡 提示:');
    log('  - 现在可以在另一个终端或浏览器中操作数据');
    log('  - 所有 WebSocket 事件都会实时显示在这里');
    log('  - 按 Ctrl+C 停止监听');
    log('  - 支持多表监听和事件过滤');
    log('============================================================');

    // 7. 定期显示统计信息
    statsInterval = setInterval(() => {
      displayStats();
    }, monitorConfig.statsInterval!);

    // 统计显示函数
    function displayStats() {
      const now = new Date();
      const duration = Math.floor((now.getTime() - startTime.getTime()) / 1000);

      log(`\n📈 [${now.toLocaleTimeString()}] 统计信息 (运行 ${duration}s):`);
      log('  总事件数:', eventStats.total);
      log('  事件类型分布:');
      for (const [type, count] of eventStats.byType.entries()) {
        log(`    ${type}: ${count}`);
      }
      log('  按表分布:');
      for (const [table, count] of eventStats.byTable.entries()) {
        const tableName = tables.find((t) => t.id === table)?.name || table;
        log(`    ${tableName}: ${count}`);
      }

      if (monitorConfig.enablePerformanceMonitor) {
        log('  性能指标:');
        log(`    平均处理时间: ${eventStats.performance.avgProcessingTime.toFixed(2)}ms`);
        log(`    最大处理时间: ${eventStats.performance.maxProcessingTime}ms`);
        log(
          `    最小处理时间: ${eventStats.performance.minProcessingTime === Infinity ? 'N/A' : eventStats.performance.minProcessingTime + 'ms'}`
        );
      }

      log('  WebSocket 状态:', sdk.getWebSocketState());

      // 内存使用情况（仅 Node.js）
      if (process.memoryUsage) {
        const memUsage = process.memoryUsage();
        log('  内存使用:');
        log(`    RSS: ${Math.round(memUsage.rss / 1024 / 1024)}MB`);
        log(`    Heap: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
      }
    }

    // 8. 处理退出信号
    process.on('SIGINT', async () => {
      await stopMonitor();
    });

    process.on('SIGTERM', async () => {
      await stopMonitor();
    });

    // 停止监听器函数
    async function stopMonitor() {
      if (!isRunning) return;

      log('\n\n🛑 收到退出信号，正在停止监听器...');
      isRunning = false;

      if (statsInterval) {
        clearInterval(statsInterval);
        statsInterval = null;
      }

      // 显示最终统计
      const endTime = new Date();
      const totalDuration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

      log('\n📊 最终统计报告:');
      log('  开始时间:', startTime.toLocaleString());
      log('  结束时间:', endTime.toLocaleString());
      log('  总运行时间:', `${totalDuration}秒`);
      log('  总事件数:', eventStats.total);
      log('  事件类型分布:');
      for (const [type, count] of eventStats.byType.entries()) {
        log(`    ${type}: ${count}`);
      }
      log('  按表分布:');
      for (const [table, count] of eventStats.byTable.entries()) {
        const tableName = tables.find((t) => t.id === table)?.name || table;
        log(`    ${tableName}: ${count}`);
      }

      if (monitorConfig.enablePerformanceMonitor) {
        log('  性能总结:');
        log(`    平均处理时间: ${eventStats.performance.avgProcessingTime.toFixed(2)}ms`);
        log(`    最大处理时间: ${eventStats.performance.maxProcessingTime}ms`);
        log(
          `    最小处理时间: ${eventStats.performance.minProcessingTime === Infinity ? 'N/A' : eventStats.performance.minProcessingTime + 'ms'}`
        );
        log(`    事件处理速率: ${(eventStats.total / (totalDuration / 60)).toFixed(2)} 事件/分钟`);
      }

      // 最近事件摘要
      if (eventStats.recentEvents.length > 0) {
        log('  最近事件 (最后5个):');
        const recent = eventStats.recentEvents.slice(-5);
        for (const event of recent) {
          log(`    [${event.timestamp.toLocaleTimeString()}] ${event.type} - ${event.table}`);
        }
      }

      await cleanup();
      log('\n✅ 监听器已停止');
      process.exit(0);
    }

    // 9. 保持程序运行
    log('\n⏳ 监听器正在运行，等待事件...');
    log('💡 使用 Ctrl+C 停止监听器');

    // 创建一个永不结束的 Promise
    await new Promise(() => {});
  } catch (err) {
    error('WebSocket 监听器启动失败', err);
    isRunning = false;
    if (statsInterval) {
      clearInterval(statsInterval);
    }
    await cleanup();
    throw err;
  }
}

// 配置选项示例
const exampleConfigs = {
  // 基础配置
  basic: {
    tableIds: ['tbl_6wDmC8NvlsAYZXcBa2XWQ'],
    logLevel: 'info' as const,
  },

  // 调试配置
  debug: {
    tableIds: ['tbl_6wDmC8NvlsAYZXcBa2XWQ'],
    enableEventFilter: false,
    enablePerformanceMonitor: true,
    logLevel: 'debug' as const,
    statsInterval: 10000, // 10秒
    maxEventHistory: 200,
  },

  // 生产配置
  production: {
    tableIds: ['tbl_6wDmC8NvlsAYZXcBa2XWQ'],
    enableEventFilter: true,
    enablePerformanceMonitor: false,
    logLevel: 'warn' as const,
    statsInterval: 60000, // 1分钟
    maxEventHistory: 50,
  },

  // 多表监听配置
  multiTable: {
    tableIds: [
      'tbl_6wDmC8NvlsAYZXcBa2XWQ',
      // 可以添加更多表ID
    ],
    enableEventFilter: true,
    enablePerformanceMonitor: true,
    logLevel: 'info' as const,
    statsInterval: 30000,
    maxEventHistory: 100,
  },
};

// 运行监听器
// 可以通过修改这里的配置来改变监听器行为
const config = exampleConfigs.debug; // 使用调试配置

console.log('🚀 启动 WebSocket 实时监听器...');
console.log('📋 使用配置:', config);

startWebSocketMonitor(config)
  .then(() => {
    console.log('\n✅ 监听器正常退出');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ 监听器异常退出:', err);
    process.exit(1);
  });
