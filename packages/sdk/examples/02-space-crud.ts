/**
 * 空间 CRUD 操作测试
 * 测试空间的创建、查询、更新、删除等操作
 */
import { initAndLogin, cleanup, log, error, separator, randomName } from './common';

async function testSpaceCRUD() {
  separator('空间 CRUD 操作测试');
  
  let createdSpaceId: string | null = null;
  
  try {
    // 初始化并登录
    const { sdk } = await initAndLogin();
    
    // 1. 创建空间
    log('1. 创建空间');
    const spaceName = randomName('测试空间');
    const space = await sdk.createSpace({
      name: spaceName,
      description: '这是一个测试空间',
    });
    createdSpaceId = space.id;
    log('创建空间成功', {
      id: space.id,
      name: space.name,
      description: space.description,
      createdAt: space.createdAt,
    });
    
    // 2. 获取空间详情
    log('\n2. 获取空间详情');
    const fetchedSpace = await sdk.getSpace(space.id);
    log('获取空间详情成功', {
      id: fetchedSpace.id,
      name: fetchedSpace.name,
      description: fetchedSpace.description,
    });
    
    // 3. 获取空间列表
    log('\n3. 获取空间列表');
    const spaces = await sdk.listSpaces();
    log('获取空间列表成功', {
      count: spaces.length,
      firstSpace: spaces[0]?.name,
    });
    
    // 4. 更新空间
    log('\n4. 更新空间');
    const updatedSpace = await sdk.updateSpace(space.id, {
      name: spaceName + '_updated',
      description: '这是一个更新后的测试空间',
    });
    log('更新空间成功', {
      id: updatedSpace.id,
      name: updatedSpace.name,
      description: updatedSpace.description,
    });
    
    // 5. 删除空间
    log('\n5. 删除空间');
    await sdk.deleteSpace(space.id);
    log('删除空间成功', { id: space.id });
    createdSpaceId = null;
    
    // 清理
    await cleanup();
    
    separator('✅ 空间 CRUD 操作测试完成');
    
  } catch (err) {
    error('空间 CRUD 操作测试失败', err);
    
    // 清理创建的资源
    if (createdSpaceId) {
      try {
        const { sdk } = await initAndLogin();
        await sdk.deleteSpace(createdSpaceId);
        log('清理测试数据成功');
      } catch (cleanupErr) {
        error('清理测试数据失败', cleanupErr);
      }
    }
    
    await cleanup();
    throw err;
  }
}

// 运行测试
testSpaceCRUD()
  .then(() => {
    console.log('\n✅ 所有测试通过');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ 测试失败:', err);
    process.exit(1);
  });

