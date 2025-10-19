/**
 * 认证功能测试
 * 测试用户登录、注册、获取当前用户等功能
 */
import { initAndLogin, cleanup, log, error, separator, randomEmail } from './common';

async function testAuth() {
  separator('认证功能测试');
  
  try {
    // 1. 测试登录
    log('1. 测试用户登录');
    const { sdk, user, accessToken } = await initAndLogin();
    log('登录成功', {
      userId: user.id,
      email: user.email,
      name: user.name,
      tokenPrefix: accessToken.substring(0, 20) + '...',
    });
    
    // 2. 获取当前用户信息
    log('\n2. 获取当前用户信息');
    const currentUser = await sdk.getCurrentUser();
    log('当前用户信息', {
      id: currentUser.id,
      email: currentUser.email,
      name: currentUser.name,
      isActive: currentUser.isActive,
    });
    
    // 3. 测试注册（可选 - 如果需要测试注册功能）
    /*
    log('\n3. 测试用户注册');
    const newEmail = randomEmail();
    const newUser = await sdk.register({
      name: 'Test User',
      email: newEmail,
      password: 'test123456',
    });
    log('注册成功', {
      userId: newUser.user.id,
      email: newUser.user.email,
    });
    */
    
    // 4. 测试登出
    log('\n4. 测试用户登出');
    await cleanup();
    log('登出成功');
    
    separator('✅ 认证功能测试完成');
    
  } catch (err) {
    error('认证功能测试失败', err);
    throw err;
  }
}

// 运行测试
testAuth()
  .then(() => {
    console.log('\n✅ 所有测试通过');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ 测试失败:', err);
    process.exit(1);
  });

