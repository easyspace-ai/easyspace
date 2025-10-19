/**
 * WebSocket 简洁监听器 - 只显示推送数据
 * 持续监听 WebSocket 事件，只显示实际的数据推送
 */
import { initAndLogin, cleanup } from './common';

// 简洁配置
interface SimpleConfig {
  tableIds?: string[];
}

// 全局状态
let config: SimpleConfig = {
  tableIds: ['tbl_6wDmC8NvlsAYZXcBa2XWQ'], // 默认监听表
};

let isRunning = false;

async function startSimpleMonitor(simpleConfig: SimpleConfig = {}) {
  // 合并配置
  config = { ...config, ...simpleConfig };

  try {
    const { sdk } = await initAndLogin();
    isRunning = true;

    // 静默连接 WebSocket
    const wsState = sdk.getWebSocketState();
    if (wsState === 'disconnected') {
      await sdk.connectWebSocket();
    }

    // 获取监听表信息
    const tables: any[] = [];
    for (const tableId of config.tableIds!) {
      try {
        const table = await sdk.getTable(tableId);
        tables.push(table);
      } catch (err) {
        // 静默处理错误
      }
    }

    // 简洁的事件处理函数 - 只显示数据
    function handleDataEvent(message: any) {
      // 只显示实际的数据推送，过滤掉订阅确认等消息
      if (message.type === 'op' && message.data && message.data.op) {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] 数据推送:`, JSON.stringify(message.data, null, 2));
      }
    }

    // 只监听记录变更事件
    sdk.onRecordChange((message) => {
      handleDataEvent(message);
    });

    // 静默订阅表格
    for (const table of tables) {
      try {
        sdk.subscribeToTable(table.id);
      } catch (err) {
        // 静默处理错误
      }
    }

    // 等待订阅生效
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 处理退出信号
    process.on('SIGINT', async () => {
      isRunning = false;
      await cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      isRunning = false;
      await cleanup();
      process.exit(0);
    });

    // 保持程序运行
    await new Promise(() => {});
  } catch (err) {
    isRunning = false;
    await cleanup();
    throw err;
  }
}

// 运行简洁监听器
startSimpleMonitor()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('监听器异常退出:', err);
    process.exit(1);
  });
