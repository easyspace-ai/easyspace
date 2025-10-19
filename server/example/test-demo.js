#!/usr/bin/env node

/**
 * 演示应用功能测试脚本
 * 用于验证登录、API调用和YJS连接功能
 */

const WebSocket = require('ws');

// 配置
const config = {
  baseURL: 'http://localhost:8888/api/v1',
  wsURL: 'ws://localhost:8888/yjs/ws',
  credentials: {
    email: 'test@example.com',
    password: 'Test123456'
  }
};

// 测试结果
const results = {
  login: false,
  spaces: false,
  bases: false,
  tables: false,
  yjsConnection: false,
  errors: []
};

console.log('🧪 演示应用功能测试');
console.log('========================');
console.log(`API地址: ${config.baseURL}`);
console.log(`WebSocket地址: ${config.wsURL}`);
console.log(`测试账号: ${config.credentials.email}`);
console.log('');

// 测试登录
async function testLogin() {
  console.log('🔐 测试用户登录...');
  
  try {
    const response = await fetch(`${config.baseURL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config.credentials)
    });

    if (response.ok) {
      const data = await response.json();
      if (data.data && data.data.accessToken) {
        results.login = true;
        results.token = data.data.accessToken;
        results.user = data.data.user;
        console.log('✅ 登录成功');
        console.log(`   用户: ${data.data.user.name || data.data.user.email}`);
        return data.data.accessToken;
      } else {
        console.log('响应数据:', JSON.stringify(data, null, 2));
        throw new Error('响应格式错误');
      }
    } else {
      const error = await response.json();
      throw new Error(error.message || `HTTP ${response.status}`);
    }
  } catch (error) {
    console.log('❌ 登录失败:', error.message);
    results.errors.push(`登录失败: ${error.message}`);
    return null;
  }
}

// 测试获取空间列表
async function testSpaces(token) {
  console.log('🏢 测试获取空间列表...');
  
  try {
    const response = await fetch(`${config.baseURL}/spaces`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      results.spaces = true;
      results.spacesData = data.data || [];
      console.log('✅ 获取空间列表成功');
      console.log(`   空间数量: ${results.spacesData.length}`);
      return results.spacesData;
    } else {
      const error = await response.json();
      throw new Error(error.message || `HTTP ${response.status}`);
    }
  } catch (error) {
    console.log('❌ 获取空间列表失败:', error.message);
    results.errors.push(`获取空间列表失败: ${error.message}`);
    return [];
  }
}

// 测试获取Base列表
async function testBases(token, spaces) {
  console.log('📁 测试获取Base列表...');
  
  if (spaces.length === 0) {
    console.log('⚠️  无空间数据，跳过Base测试');
    return [];
  }

  try {
    const spaceId = spaces[0].id;
    const response = await fetch(`${config.baseURL}/spaces/${spaceId}/bases`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      results.bases = true;
      results.basesData = data.data || [];
      console.log('✅ 获取Base列表成功');
      console.log(`   Base数量: ${results.basesData.length}`);
      return results.basesData;
    } else {
      const error = await response.json();
      throw new Error(error.message || `HTTP ${response.status}`);
    }
  } catch (error) {
    console.log('❌ 获取Base列表失败:', error.message);
    results.errors.push(`获取Base列表失败: ${error.message}`);
    return [];
  }
}

// 测试获取表列表
async function testTables(token, bases) {
  console.log('📋 测试获取表列表...');
  
  if (bases.length === 0) {
    console.log('⚠️  无Base数据，跳过表测试');
    return [];
  }

  try {
    const baseId = bases[0].id;
    const response = await fetch(`${config.baseURL}/bases/${baseId}/tables`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      results.tables = true;
      results.tablesData = data.data || [];
      console.log('✅ 获取表列表成功');
      console.log(`   表数量: ${results.tablesData.length}`);
      return results.tablesData;
    } else {
      const error = await response.json();
      throw new Error(error.message || `HTTP ${response.status}`);
    }
  } catch (error) {
    console.log('❌ 获取表列表失败:', error.message);
    results.errors.push(`获取表列表失败: ${error.message}`);
    return [];
  }
}

// 测试YJS WebSocket连接
async function testYjsConnection(token, tables) {
  console.log('🔗 测试YJS WebSocket连接...');
  
  const documentId = tables.length > 0 ? `table:${tables[0].id}` : 'test-document';
  
  return new Promise((resolve) => {
    const ws = new WebSocket(`${config.wsURL}?document=${documentId}&user=test-user&token=${token}`);
    
    const timeout = setTimeout(() => {
      console.log('❌ YJS连接超时');
      results.errors.push('YJS连接超时');
      ws.close();
      resolve(false);
    }, 5000);

    ws.on('open', () => {
      clearTimeout(timeout);
      results.yjsConnection = true;
      console.log('✅ YJS WebSocket连接成功');
      console.log(`   文档ID: ${documentId}`);
      ws.close();
      resolve(true);
    });

    ws.on('error', (error) => {
      clearTimeout(timeout);
      console.log('❌ YJS连接失败:', error.message);
      results.errors.push(`YJS连接失败: ${error.message}`);
      resolve(false);
    });
  });
}

// 运行所有测试
async function runTests() {
  console.log('开始运行测试...\n');

  // 1. 测试登录
  const token = await testLogin();
  if (!token) {
    console.log('\n❌ 登录失败，无法继续测试');
    showResults();
    return;
  }

  // 2. 测试获取空间列表
  const spaces = await testSpaces(token);

  // 3. 测试获取Base列表
  const bases = await testBases(token, spaces);

  // 4. 测试获取表列表
  const tables = await testTables(token, bases);

  // 5. 测试YJS连接
  await testYjsConnection(token, tables);

  console.log('\n测试完成！');
  showResults();
}

// 显示测试结果
function showResults() {
  console.log('\n📊 测试结果');
  console.log('============');
  console.log(`登录功能: ${results.login ? '✅ 通过' : '❌ 失败'}`);
  console.log(`空间API: ${results.spaces ? '✅ 通过' : '❌ 失败'}`);
  console.log(`Base API: ${results.bases ? '✅ 通过' : '❌ 失败'}`);
  console.log(`表API: ${results.tables ? '✅ 通过' : '❌ 失败'}`);
  console.log(`YJS连接: ${results.yjsConnection ? '✅ 通过' : '❌ 失败'}`);

  if (results.errors.length > 0) {
    console.log('\n❌ 错误信息:');
    results.errors.forEach(error => {
      console.log(`   - ${error}`);
    });
  }

  const successCount = Object.values(results).filter(v => v === true).length;
  const totalTests = 5;
  const successRate = (successCount / totalTests * 100).toFixed(1);

  console.log(`\n总体结果: ${successCount}/${totalTests} 通过 (${successRate}%)`);

  if (successCount === totalTests) {
    console.log('🎉 所有测试通过！演示应用功能正常');
  } else {
    console.log('⚠️  部分测试失败，请检查服务器状态');
  }
}

// 检查依赖
function checkDependencies() {
  try {
    require('ws');
    return true;
  } catch (error) {
    console.log('❌ 缺少依赖: ws');
    console.log('请运行: npm install ws');
    return false;
  }
}

// 主函数
async function main() {
  if (!checkDependencies()) {
    process.exit(1);
  }

  try {
    await runTests();
  } catch (error) {
    console.error('测试过程中发生错误:', error);
    process.exit(1);
  }
}

// 处理进程退出
process.on('SIGINT', () => {
  console.log('\n🛑 测试中断');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 测试终止');
  process.exit(0);
});

// 运行测试
main();
