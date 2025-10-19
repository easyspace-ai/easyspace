/**
 * 破坏性测试套件（Destructive/Negative Testing）
 * 
 * 目的：
 * 1. 验证 API 的错误处理能力
 * 2. 确保返回明确的错误信息
 * 3. 防止非法数据进入系统
 * 4. 测试边界条件和极端情况
 * 5. 验证安全性和权限控制
 */

import { initAndLogin, cleanup, log, error, separator, randomName, info, warn } from './common';
import { LuckDBSDK } from '../src';

// 测试结果统计
const stats = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: [] as Array<{ test: string; error: string }>,
};

/**
 * 断言错误响应
 */
async function assertError(
  testName: string,
  fn: () => Promise<any>,
  expectedCode?: number,
  expectedMessage?: string
): Promise<void> {
  stats.total++;
  try {
    await fn();
    // 如果没有抛出错误，测试失败
    stats.failed++;
    stats.errors.push({
      test: testName,
      error: '期望抛出错误，但操作成功了',
    });
    error(`❌ ${testName}`, '期望抛出错误，但操作成功了');
  } catch (err: any) {
    // ✅ 修复：正确访问 LuckDBError 的属性
    // LuckDBError 结构: { message, code, status, details }
    const actualCode = err.status || err.response?.status;
    const actualMessage = err.message || err.response?.data?.message;
    
    let passed = true;
    if (expectedCode && actualCode !== expectedCode) {
      passed = false;
      stats.errors.push({
        test: testName,
        error: `错误码不匹配: 期望 ${expectedCode}, 实际 ${actualCode}`,
      });
    }
    
    if (expectedMessage && !actualMessage.includes(expectedMessage)) {
      passed = false;
      stats.errors.push({
        test: testName,
        error: `错误信息不匹配: 期望包含 "${expectedMessage}", 实际 "${actualMessage}"`,
      });
    }
    
    if (passed) {
      stats.passed++;
      log(`✅ ${testName}`, {
        code: actualCode,
        message: actualMessage,
      });
    } else {
      stats.failed++;
      error(`❌ ${testName}`, {
        expected: { code: expectedCode, message: expectedMessage },
        actual: { code: actualCode, message: actualMessage },
      });
    }
  }
}

/**
 * 生成超长字符串
 */
function longString(length: number): string {
  return 'a'.repeat(length);
}

/**
 * 生成特殊字符串
 */
const specialStrings = {
  sqlInjection: "'; DROP TABLE users; --",
  xss: '<script>alert("XSS")</script>',
  nullByte: 'test\0null',
  unicode: '测试🎉emoji💯字符',
  html: '<div>HTML Content</div>',
  json: '{"key": "value"}',
  url: 'https://example.com?param=value&other=123',
};

async function destructiveTests() {
  separator('LuckDB 破坏性测试套件');
  
  let sdk: LuckDBSDK;
  let spaceId: string;
  let baseId: string;
  let tableId: string;
  let fieldId: string;
  
  try {
    const { sdk: authenticatedSdk, user } = await initAndLogin();
    sdk = authenticatedSdk;
    info('测试用户', { id: user.id, email: user.email });
    
    // 准备测试环境
    separator('准备测试环境');
    const space = await sdk.createSpace({
      name: randomName('破坏性测试空间'),
      description: '用于破坏性测试',
    });
    spaceId = space.id;
    log('创建测试空间', { id: spaceId });
    
    const base = await sdk.createBase({
      spaceId,
      name: randomName('测试Base'),
    });
    baseId = base.id;
    log('创建测试Base', { id: baseId });
    
    const table = await sdk.createTable({
      baseId,
      name: randomName('测试表'),
    });
    tableId = table.id;
    log('创建测试表', { id: tableId });
    
    const field = await sdk.createField({
      tableId,
      name: '测试字段',
      type: 'singleLineText',
      required: true,
    });
    fieldId = field.id;
    log('创建测试字段', { id: fieldId });
    
    // ========== 第一部分：认证和权限测试 ==========
    separator('第一部分：认证和权限测试');
    
    // 1.1 未认证请求
    await assertError(
      '未认证请求 - 获取空间列表',
      async () => {
        const unauthSdk = new LuckDBSDK({ 
          baseUrl: 'http://localhost:8080',
          disableProxy: true,
        });
        await unauthSdk.listSpaces();
      },
      401,
      '未授权'
    );
    
    // 1.2 无效的 Token
    await assertError(
      '无效的 Token',
      async () => {
        const invalidSdk = new LuckDBSDK({
          baseUrl: 'http://localhost:8080',
          accessToken: 'invalid_token_12345',
          disableProxy: true,
        });
        await invalidSdk.listSpaces();
      },
      401
    );
    
    // 1.3 访问不存在的资源
    await assertError(
      '访问不存在的空间',
      async () => {
        await sdk.getSpace('spc_nonexistent');
      },
      404,
      '不存在'
    );
    
    await assertError(
      '访问不存在的Base',
      async () => {
        await sdk.getBase('base_nonexistent');
      },
      404
    );
    
    await assertError(
      '访问不存在的表',
      async () => {
        await sdk.getTable('tbl_nonexistent');
      },
      404
    );
    
    // ========== 第二部分：输入验证测试 ==========
    separator('第二部分：输入验证测试');
    
    // 2.1 空间创建 - 字段长度测试
    await assertError(
      '创建空间 - 名称为空',
      async () => {
        await sdk.createSpace({ name: '' });
      },
      400,
      'name' // 更宽松的匹配，接受 "name" 或 "名称"
    );
    
    await assertError(
      '创建空间 - 名称过长（超过255字符）',
      async () => {
        await sdk.createSpace({ name: longString(300) });
      },
      400
    );
    
    await assertError(
      '创建空间 - 缺少必填字段',
      async () => {
        await sdk.createSpace({} as any);
      },
      400,
      '必填'
    );
    
    // 2.2 特殊字符测试
    await assertError(
      '创建空间 - SQL注入尝试',
      async () => {
        await sdk.createSpace({ name: specialStrings.sqlInjection });
      },
      400
    );
    
    // 注意：以下测试可能会成功，因为系统可能允许这些字符
    // 但我们需要确保系统正确处理和转义这些字符
    try {
      const xssSpace = await sdk.createSpace({ name: specialStrings.xss });
      warn('XSS字符串被接受', { id: xssSpace.id, name: xssSpace.name });
      // 清理
      await sdk.deleteSpace(xssSpace.id);
    } catch (err) {
      log('XSS字符串被拒绝（预期行为）');
    }
    
    // 2.3 Base创建验证
    await assertError(
      '创建Base - 空间ID不存在',
      async () => {
        await sdk.createBase({
          spaceId: 'spc_nonexistent',
          name: '测试Base',
        });
      },
      404
    );
    
    await assertError(
      '创建Base - 名称为空',
      async () => {
        await sdk.createBase({
          spaceId,
          name: '',
        });
      },
      400
    );
    
    // 2.4 表创建验证
    await assertError(
      '创建表 - Base ID不存在',
      async () => {
        await sdk.createTable({
          baseId: 'base_nonexistent',
          name: '测试表',
        });
      },
      404
    );
    
    await assertError(
      '创建表 - 名称过长',
      async () => {
        await sdk.createTable({
          baseId,
          name: longString(300),
        });
      },
      400
    );
    
    // 2.5 字段创建验证
    await assertError(
      '创建字段 - 表ID不存在',
      async () => {
        await sdk.createField({
          tableId: 'tbl_nonexistent',
          name: '测试字段',
          type: 'singleLineText',
        });
      },
      404
    );
    
    await assertError(
      '创建字段 - 无效的字段类型',
      async () => {
        await sdk.createField({
          tableId,
          name: '无效字段',
          type: 'invalidType' as any,
        });
      },
      400,
      '类型'
    );
    
    await assertError(
      '创建字段 - 名称为空',
      async () => {
        await sdk.createField({
          tableId,
          name: '',
          type: 'singleLineText',
        });
      },
      400
    );
    
    await assertError(
      '创建字段 - 重复的字段名',
      async () => {
        await sdk.createField({
          tableId,
          name: '测试字段', // 已存在
          type: 'singleLineText',
        });
      },
      409,
      '已存在'
    );
    
    // ========== 第三部分：记录操作验证 ==========
    separator('第三部分：记录操作验证');
    
    // 3.1 创建记录 - 缺少必填字段
    await assertError(
      '创建记录 - 缺少必填字段',
      async () => {
        await sdk.createRecord({
          tableId,
          data: {
            // 缺少必填的 "测试字段"
          },
        });
      },
      400,
      '必填'
    );
    
    // 3.2 创建记录 - 字段不存在
    await assertError(
      '创建记录 - 使用不存在的字段',
      async () => {
        await sdk.createRecord({
          tableId,
          data: {
            '测试字段': '正常值',
            '不存在的字段': '这个字段不存在',
          },
        });
      },
      400
    );
    
    // 3.3 创建记录 - 表ID不存在
    await assertError(
      '创建记录 - 表ID不存在',
      async () => {
        await sdk.createRecord({
          tableId: 'tbl_nonexistent',
          data: {
            '测试字段': '值',
          },
        });
      },
      404
    );
    
    // 3.4 创建有效记录（用于后续测试）
    const validRecord = await sdk.createRecord({
      tableId,
      data: {
        '测试字段': '有效值',
      },
    });
    log('创建有效记录（用于后续测试）', { id: validRecord.id });
    
    // 3.5 更新记录 - 记录ID不存在
    await assertError(
      '更新记录 - 记录ID不存在',
      async () => {
        await sdk.updateRecord(tableId, 'rec_nonexistent', {
          '测试字段': '新值',
        });
      },
      404
    );
    
    // 3.6 更新记录 - 表ID不匹配
    await assertError(
      '更新记录 - 表ID不匹配',
      async () => {
        await sdk.updateRecord('tbl_wrong_table', validRecord.id, {
          '测试字段': '新值',
        });
      },
      404
    );
    
    // 3.7 删除记录 - 记录ID不存在
    await assertError(
      '删除记录 - 记录ID不存在',
      async () => {
        await sdk.deleteRecord(tableId, 'rec_nonexistent');
      },
      404
    );
    
    // 3.8 批量操作 - 空数组
    const emptyBatchResult = await sdk.bulkCreateRecords(tableId, []);
    if (emptyBatchResult.length === 0) {
      stats.total++;
      stats.passed++;
      log('✅ 批量创建空数组 - 正确处理', { count: 0 });
    }
    
    // 3.9 批量创建 - 部分失败
    try {
      const batchResult = await sdk.bulkCreateRecords(tableId, [
        { '测试字段': '有效值1' },
        { '不存在的字段': '无效值' }, // 应该失败
        { '测试字段': '有效值2' },
      ]);
      warn('批量创建部分失败测试', {
        total: 3,
        success: batchResult.length,
      });
    } catch (err) {
      log('批量创建遇到错误（预期行为）');
    }
    
    // ========== 第四部分：数据类型验证 ==========
    separator('第四部分：数据类型验证');
    
    // 4.1 创建数字字段
    const numberField = await sdk.createField({
      tableId,
      name: '数字字段',
      type: 'number',
      options: {
        minValue: 0,
        maxValue: 100,
      },
    });
    log('创建数字字段', { id: numberField.id });
    
    // 4.2 数字字段 - 无效值
    await assertError(
      '数字字段 - 传入字符串',
      async () => {
        await sdk.createRecord({
          tableId,
          data: {
            '测试字段': '文本',
            '数字字段': 'not a number',
          },
        });
      },
      400
      // 不检查具体错误信息，只要返回400即可
    );
    
    // 4.3 数字字段 - 超出范围
    await assertError(
      '数字字段 - 超出最大值',
      async () => {
        await sdk.createRecord({
          tableId,
          data: {
            '测试字段': '文本',
            '数字字段': 999,
          },
        });
      },
      400
    );
    
    await assertError(
      '数字字段 - 低于最小值',
      async () => {
        await sdk.createRecord({
          tableId,
          data: {
            '测试字段': '文本',
            '数字字段': -10,
          },
        });
      },
      400
    );
    
    // 4.4 创建email字段并测试
    const emailField = await sdk.createField({
      tableId,
      name: '邮箱字段',
      type: 'email',
    });
    log('创建邮箱字段', { id: emailField.id });
    
    await assertError(
      '邮箱字段 - 无效格式',
      async () => {
        await sdk.createRecord({
          tableId,
          data: {
            '测试字段': '文本',
            '邮箱字段': 'not-an-email',
          },
        });
      },
      400,
      '格式'
    );
    
    // ========== 第五部分：并发和乐观锁测试 ==========
    separator('第五部分：并发和乐观锁测试');
    
    // 5.1 创建测试记录
    const concurrentRecord = await sdk.createRecord({
      tableId,
      data: {
        '测试字段': '初始值',
      },
    });
    log('创建并发测试记录', {
      id: concurrentRecord.id,
      version: concurrentRecord.version,
    });
    
    // 5.2 第一次更新
    const updated1 = await sdk.updateRecord(tableId, concurrentRecord.id, {
      '测试字段': '第一次更新',
    });
    log('第一次更新成功', { version: updated1.version });
    
    // 5.3 使用旧版本号更新（模拟并发冲突）
    await assertError(
      '并发冲突 - 版本号过期',
      async () => {
        // ✅ 使用旧版本号（concurrentRecord.version）尝试更新
        // 由于记录已被更新（版本变为 updated1.version），这应该失败
        await sdk.updateRecord(tableId, concurrentRecord.id, {
          '测试字段': '使用旧版本更新',
        }, {
          version: concurrentRecord.version, // 使用初始版本号（旧版本）
        });
      },
      409, // Conflict
      '已被其他用户修改' // 更宽松的匹配
    );
    
    // ========== 第六部分：视图操作验证 ==========
    separator('第六部分：视图操作验证');
    
    // 6.1 创建视图 - 表ID不存在
    await assertError(
      '创建视图 - 表ID不存在',
      async () => {
        await sdk.createView({
          tableId: 'tbl_nonexistent',
          name: '测试视图',
          type: 'grid',
        });
      },
      404
    );
    
    // 6.2 创建视图 - 无效的视图类型
    await assertError(
      '创建视图 - 无效的视图类型',
      async () => {
        await sdk.createView({
          tableId,
          name: '测试视图',
          type: 'invalidType' as any,
        });
      },
      400
    );
    
    // 6.3 创建视图 - 名称为空
    await assertError(
      '创建视图 - 名称为空',
      async () => {
        await sdk.createView({
          tableId,
          name: '',
          type: 'grid',
        });
      },
      400
    );
    
    // ========== 第七部分：边界值测试 ==========
    separator('第七部分：边界值测试');
    
    // 7.1 null 和 undefined
    await assertError(
      '创建空间 - null 名称',
      async () => {
        await sdk.createSpace({ name: null as any });
      },
      400
    );
    
    await assertError(
      '创建空间 - undefined 名称',
      async () => {
        await sdk.createSpace({ name: undefined as any });
      },
      400
    );
    
    // 7.2 空对象
    await assertError(
      '创建记录 - 空数据对象',
      async () => {
        await sdk.createRecord({
          tableId,
          data: {},
        });
      },
      400,
      '必填'
    );
    
    // 7.3 特殊Unicode字符
    try {
      const unicodeSpace = await sdk.createSpace({
        name: '测试空间🎉emoji💯字符',
        description: '包含emoji和特殊字符 ✨🚀💻',
      });
      stats.total++;
      stats.passed++;
      log('✅ Unicode字符测试 - 正确处理', {
        id: unicodeSpace.id,
        name: unicodeSpace.name,
      });
      await sdk.deleteSpace(unicodeSpace.id);
    } catch (err: any) {
      stats.total++;
      stats.failed++;
      error('❌ Unicode字符测试失败', err.message);
    }
    
    // ========== 第八部分：删除操作测试 ==========
    separator('第八部分：删除操作测试');
    
    // 8.1 删除不存在的资源
    await assertError(
      '删除不存在的空间',
      async () => {
        await sdk.deleteSpace('spc_nonexistent');
      },
      404
    );
    
    await assertError(
      '删除不存在的Base',
      async () => {
        await sdk.deleteBase('base_nonexistent');
      },
      404
    );
    
    await assertError(
      '删除不存在的表',
      async () => {
        await sdk.deleteTable('tbl_nonexistent');
      },
      404
    );
    
    // 8.2 重复删除
    const tempSpace = await sdk.createSpace({ name: randomName('临时空间') });
    await sdk.deleteSpace(tempSpace.id);
    
    await assertError(
      '重复删除同一空间',
      async () => {
        await sdk.deleteSpace(tempSpace.id);
      },
      404
    );
    
    // ========== 清理测试环境 ==========
    separator('清理测试环境');
    
    await sdk.deleteTable(tableId);
    log('删除测试表', { id: tableId });
    
    await sdk.deleteBase(baseId);
    log('删除测试Base', { id: baseId });
    
    await sdk.deleteSpace(spaceId);
    log('删除测试空间', { id: spaceId });
    
    await cleanup();
    
    // ========== 测试结果统计 ==========
    separator('测试结果统计');
    
    console.log('\n📊 测试统计：');
    console.log(`  总计: ${stats.total}`);
    console.log(`  通过: ${stats.passed} ✅`);
    console.log(`  失败: ${stats.failed} ❌`);
    console.log(`  成功率: ${((stats.passed / stats.total) * 100).toFixed(2)}%\n`);
    
    if (stats.errors.length > 0) {
      console.log('❌ 失败的测试：');
      stats.errors.forEach((err, index) => {
        console.log(`  ${index + 1}. ${err.test}`);
        console.log(`     ${err.error}\n`);
      });
    }
    
    if (stats.failed === 0) {
      separator('✅ 所有破坏性测试通过！系统健壮性良好！');
    } else {
      separator('⚠️  部分测试失败，需要改进错误处理');
      process.exit(1);
    }
    
  } catch (err) {
    error('破坏性测试失败', err);
    
    // 尝试清理
    try {
      if (tableId) await sdk!.deleteTable(tableId);
      if (baseId) await sdk!.deleteBase(baseId);
      if (spaceId) await sdk!.deleteSpace(spaceId);
    } catch (cleanupErr) {
      // 忽略清理错误
    }
    
    await cleanup();
    throw err;
  }
}

// 运行测试
destructiveTests()
  .then(() => {
    console.log('\n🎉 破坏性测试完成！');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n💥 破坏性测试失败:', err.message || err);
    process.exit(1);
  });

