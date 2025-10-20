/**
 * 环境配置初始化脚本
 * 用于创建和配置 .env 文件
 */

import { envManager } from './common/env-manager';

async function setupEnvironment() {
  console.log('🚀 环境配置初始化...\n');

  try {
    // 初始化环境配置
    envManager.initialize();

    console.log('\n✅ 环境配置初始化完成！');
    console.log('\n📋 下一步：');
    console.log('1. 编辑 .env 文件以配置你的测试环境');
    console.log('2. 运行测试: bun test:yjs-discover');
    console.log('3. 或运行其他测试脚本\n');

  } catch (error: any) {
    console.error('❌ 初始化失败:', error.message);
    process.exit(1);
  }
}

// 运行初始化
setupEnvironment()
  .then(() => {
    console.log('🎉 完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 失败:', error);
    process.exit(1);
  });
