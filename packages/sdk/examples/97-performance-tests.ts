/**
 * 性能和压力测试套件
 * 
 * 目的：
 * 1. 测试大批量数据操作
 * 2. 验证并发请求处理能力
 * 3. 测试响应时间和吞吐量
 * 4. 发现性能瓶颈
 */

import { initAndLogin, cleanup, log, error, separator, randomName, info } from './common';

// 性能测试配置
const PERF_CONFIG = {
  batchSize: {
    small: 10,
    medium: 50,
    large: 100,
  },
  concurrency: {
    low: 5,
    medium: 10,
    high: 20,
  },
  timeout: 30000, // 30秒超时
};

// 性能指标
interface PerfMetrics {
  testName: string;
  operations: number;
  duration: number;
  throughput: number; // ops/sec
  avgLatency: number; // ms
  minLatency: number;
  maxLatency: number;
  errors: number;
}

const perfResults: PerfMetrics[] = [];

/**
 * 测量性能
 */
async function measurePerformance(
  testName: string,
  fn: () => Promise<void>,
  operations: number = 1
): Promise<PerfMetrics> {
  const latencies: number[] = [];
  let errors = 0;
  
  const startTime = Date.now();
  
  try {
    const opStart = Date.now();
    await fn();
    const opEnd = Date.now();
    latencies.push(opEnd - opStart);
  } catch (err) {
    errors++;
  }
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  const throughput = (operations / duration) * 1000; // ops/sec
  
  const metrics: PerfMetrics = {
    testName,
    operations,
    duration,
    throughput,
    avgLatency: latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
    minLatency: latencies.length > 0 ? Math.min(...latencies) : 0,
    maxLatency: latencies.length > 0 ? Math.max(...latencies) : 0,
    errors,
  };
  
  perfResults.push(metrics);
  
  log(`📊 ${testName}`, {
    operations,
    duration: `${duration}ms`,
    throughput: `${throughput.toFixed(2)} ops/sec`,
    avgLatency: `${metrics.avgLatency.toFixed(2)}ms`,
  });
  
  return metrics;
}

/**
 * 并发执行
 */
async function runConcurrent<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number
): Promise<T[]> {
  const results: T[] = [];
  const executing: Promise<void>[] = [];
  
  for (const task of tasks) {
    const promise = task().then((result) => {
      results.push(result);
      executing.splice(executing.indexOf(promise), 1);
    });
    
    executing.push(promise);
    
    if (executing.length >= concurrency) {
      await Promise.race(executing);
    }
  }
  
  await Promise.all(executing);
  return results;
}

async function performanceTests() {
  separator('LuckDB 性能和压力测试');
  
  const { sdk, user } = await initAndLogin();
  info('测试用户', { id: user.id, email: user.email });
  
  // 准备测试环境
  const space = await sdk.createSpace({
    name: randomName('性能测试空间'),
  });
  log('创建测试空间', { id: space.id });
  
  const base = await sdk.createBase({
    spaceId: space.id,
    name: randomName('性能测试Base'),
  });
  log('创建测试Base', { id: base.id });
  
  const table = await sdk.createTable({
    baseId: base.id,
    name: randomName('性能测试表'),
  });
  log('创建测试表', { id: table.id });
  
  // 创建测试字段
  const field1 = await sdk.createField({
    tableId: table.id,
    name: '文本字段',
    type: 'singleLineText',
  });
  
  const field2 = await sdk.createField({
    tableId: table.id,
    name: '数字字段',
    type: 'number',
  });
  
  log('创建测试字段', { field1: field1.id, field2: field2.id });
  
  try {
    // ========== 测试1：批量创建记录 ==========
    separator('测试1：批量创建记录性能');
    
    // 1.1 小批量（10条）
    await measurePerformance(
      '批量创建10条记录',
      async () => {
        const records = Array.from({ length: PERF_CONFIG.batchSize.small }, (_, i) => ({
          [field1.name]: `记录_${i}`,
          [field2.name]: i,
        }));
        await sdk.bulkCreateRecords(table.id, records);
      },
      PERF_CONFIG.batchSize.small
    );
    
    // 1.2 中批量（50条）
    await measurePerformance(
      '批量创建50条记录',
      async () => {
        const records = Array.from({ length: PERF_CONFIG.batchSize.medium }, (_, i) => ({
          [field1.name]: `记录_${i + 100}`,
          [field2.name]: i + 100,
        }));
        await sdk.bulkCreateRecords(table.id, records);
      },
      PERF_CONFIG.batchSize.medium
    );
    
    // 1.3 大批量（100条）
    await measurePerformance(
      '批量创建100条记录',
      async () => {
        const records = Array.from({ length: PERF_CONFIG.batchSize.large }, (_, i) => ({
          [field1.name]: `记录_${i + 200}`,
          [field2.name]: i + 200,
        }));
        await sdk.bulkCreateRecords(table.id, records);
      },
      PERF_CONFIG.batchSize.large
    );
    
    // ========== 测试2：查询性能 ==========
    separator('测试2：查询性能');
    
    // 2.1 查询所有记录
    await measurePerformance(
      '查询所有记录（~160条）',
      async () => {
        await sdk.listRecords({ tableId: table.id, limit: 200 });
      },
      1
    );
    
    // 2.2 分页查询
    await measurePerformance(
      '分页查询（10条/页）',
      async () => {
        await sdk.listRecords({ tableId: table.id, limit: 10, offset: 0 });
      },
      1
    );
    
    // ========== 测试3：并发创建 ==========
    separator('测试3：并发创建记录');
    
    // 3.1 低并发（5个并发）
    const concurrentStart1 = Date.now();
    const tasks1 = Array.from({ length: PERF_CONFIG.concurrency.low }, (_, i) => 
      () => sdk.createRecord({
        tableId: table.id,
        data: {
          [field1.name]: `并发记录_low_${i}`,
          [field2.name]: i,
        },
      })
    );
    await runConcurrent(tasks1, PERF_CONFIG.concurrency.low);
    const concurrentDuration1 = Date.now() - concurrentStart1;
    log('低并发创建（5个并发）', {
      count: PERF_CONFIG.concurrency.low,
      duration: `${concurrentDuration1}ms`,
      avgPerOp: `${(concurrentDuration1 / PERF_CONFIG.concurrency.low).toFixed(2)}ms`,
    });
    
    // 3.2 中并发（10个并发）
    const concurrentStart2 = Date.now();
    const tasks2 = Array.from({ length: PERF_CONFIG.concurrency.medium }, (_, i) => 
      () => sdk.createRecord({
        tableId: table.id,
        data: {
          [field1.name]: `并发记录_medium_${i}`,
          [field2.name]: i,
        },
      })
    );
    await runConcurrent(tasks2, PERF_CONFIG.concurrency.medium);
    const concurrentDuration2 = Date.now() - concurrentStart2;
    log('中并发创建（10个并发）', {
      count: PERF_CONFIG.concurrency.medium,
      duration: `${concurrentDuration2}ms`,
      avgPerOp: `${(concurrentDuration2 / PERF_CONFIG.concurrency.medium).toFixed(2)}ms`,
    });
    
    // ========== 测试4：更新性能 ==========
    separator('测试4：批量更新性能');
    
    // 获取所有记录
    const allRecords = await sdk.listRecords({ tableId: table.id, limit: 200 });
    const recordsToUpdate = allRecords.data.list.slice(0, 50);
    
    await measurePerformance(
      '批量更新50条记录',
      async () => {
        const updates = recordsToUpdate.map((record) => ({
          id: record.id,
          data: {
            [field1.name]: `更新_${record.id}`,
          },
        }));
        await sdk.bulkUpdateRecords(updates);
      },
      50
    );
    
    // ========== 测试5：复杂查询性能 ==========
    separator('测试5：视图和过滤性能');
    
    // 5.1 创建视图
    await measurePerformance(
      '创建视图',
      async () => {
        await sdk.createView({
          tableId: table.id,
          name: '性能测试视图',
          type: 'grid',
        });
      },
      1
    );
    
    // 5.2 列出所有视图
    await measurePerformance(
      '列出表的所有视图',
      async () => {
        await sdk.listViews({ tableId: table.id });
      },
      1
    );
    
    // ========== 测试6：字段操作性能 ==========
    separator('测试6：字段操作性能');
    
    // 6.1 创建多个字段
    await measurePerformance(
      '连续创建10个字段',
      async () => {
        for (let i = 0; i < 10; i++) {
          await sdk.createField({
            tableId: table.id,
            name: `性能字段_${i}`,
            type: 'singleLineText',
          });
        }
      },
      10
    );
    
    // 6.2 列出所有字段
    await measurePerformance(
      '列出表的所有字段',
      async () => {
        await sdk.listFields({ tableId: table.id });
      },
      1
    );
    
    // ========== 输出性能报告 ==========
    separator('性能测试报告');
    
    console.log('\n📊 详细性能指标：\n');
    console.log('测试名称'.padEnd(40), '操作数', '耗时(ms)', '吞吐量(ops/s)', '平均延迟(ms)');
    console.log('='.repeat(100));
    
    perfResults.forEach((metrics) => {
      console.log(
        metrics.testName.padEnd(40),
        metrics.operations.toString().padEnd(8),
        metrics.duration.toString().padEnd(10),
        metrics.throughput.toFixed(2).padEnd(15),
        metrics.avgLatency.toFixed(2).padEnd(15)
      );
    });
    
    console.log('='.repeat(100));
    
    // 性能评估
    separator('性能评估');
    
    const avgThroughput = perfResults.reduce((sum, m) => sum + m.throughput, 0) / perfResults.length;
    const avgLatency = perfResults.reduce((sum, m) => sum + m.avgLatency, 0) / perfResults.length;
    
    console.log(`\n平均吞吐量: ${avgThroughput.toFixed(2)} ops/sec`);
    console.log(`平均延迟: ${avgLatency.toFixed(2)} ms`);
    console.log(`总测试数: ${perfResults.length}`);
    console.log(`总操作数: ${perfResults.reduce((sum, m) => sum + m.operations, 0)}`);
    
    // 性能建议
    console.log('\n💡 性能建议：');
    
    if (avgLatency > 1000) {
      console.log('  ⚠️  平均延迟较高，建议优化服务器响应速度');
    } else if (avgLatency > 500) {
      console.log('  ✅ 平均延迟适中，性能良好');
    } else {
      console.log('  🚀 平均延迟很低，性能优秀！');
    }
    
    if (avgThroughput < 10) {
      console.log('  ⚠️  吞吐量较低，建议优化并发处理能力');
    } else if (avgThroughput < 50) {
      console.log('  ✅ 吞吐量适中');
    } else {
      console.log('  🚀 吞吐量很高！');
    }
    
  } finally {
    // 清理测试数据
    separator('清理测试数据');
    
    await sdk.deleteTable(table.id);
    log('删除测试表', { id: table.id });
    
    await sdk.deleteBase(base.id);
    log('删除测试Base', { id: base.id });
    
    await sdk.deleteSpace(space.id);
    log('删除测试空间', { id: space.id });
    
    await cleanup();
    
    separator('✅ 性能测试完成！');
  }
}

// 运行测试
performanceTests()
  .then(() => {
    console.log('\n🎉 所有性能测试完成！');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n💥 性能测试失败:', err.message || err);
    process.exit(1);
  });

