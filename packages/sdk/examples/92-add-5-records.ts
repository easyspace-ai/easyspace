/**
 * 为指定表格添加5条测试记录
 */

import { initAndLogin, log, error, separator } from './common';

// 生成随机测试数据
function generateRandomData() {
  const firstNames = ['张', '李', '王', '刘', '陈', '杨', '赵', '黄', '周', '吴', '徐', '孙', '胡', '朱', '高', '林', '何', '郭', '马', '罗'];
  const lastNames = ['伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '军', '洋', '勇', '艳', '杰', '娟', '涛', '明', '超', '秀兰', '霞'];
  const cities = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安', '南京', '重庆', '苏州', '天津', '长沙', '青岛', '大连'];
  const companies = ['阿里巴巴', '腾讯', '字节跳动', '百度', '美团', '京东', '网易', '小米', '华为', '拼多多', 'Shopee', 'Lazada', 'TikTok', 'Zoom', 'Slack'];
  const departments = ['技术部', '产品部', '运营部', '市场部', '销售部', '人力资源部', '财务部', '行政部', '客服部', '设计部'];
  const positions = ['工程师', '产品经理', '设计师', '运营专员', '销售经理', 'HR', '财务专员', '行政助理', '客服代表', 'UI设计师'];
  const statuses = ['在职', '试用期', '离职', '休假', '出差'];
  const priorities = ['低', '中', '高', '紧急', '非常紧急'];
  const tags = ['重要', '紧急', '待办', '进行中', '已完成', '已取消', '延期', '高优先级', '低优先级'];
  
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  
  return {
    name: `${firstName}${lastName}`,
    city: cities[Math.floor(Math.random() * cities.length)],
    company: companies[Math.floor(Math.random() * companies.length)],
    department: departments[Math.floor(Math.random() * departments.length)],
    position: positions[Math.floor(Math.random() * positions.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    priority: priorities[Math.floor(Math.random() * priorities.length)],
    tags: tags.slice(0, Math.floor(Math.random() * 3) + 1),
    age: Math.floor(Math.random() * 30) + 22, // 22-52岁
    salary: Math.floor(Math.random() * 50000) + 5000, // 5000-55000
    rating: Math.floor(Math.random() * 5) + 1, // 1-5星
    isActive: Math.random() > 0.3, // 70%概率为true
    joinDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000 * 3).toISOString(), // 3年内随机日期
  };
}

// 生成随机邮箱
function randomEmail(name: string): string {
  const domains = ['gmail.com', 'outlook.com', '163.com', 'qq.com', 'hotmail.com', 'yahoo.com'];
  return `${name.toLowerCase()}${Math.floor(Math.random() * 1000)}@${domains[Math.floor(Math.random() * domains.length)]}`;
}

// 生成随机电话
function randomPhone(): string {
  const prefixes = ['138', '139', '156', '158', '186', '188', '131', '132', '155', '157'];
  return `${prefixes[Math.floor(Math.random() * prefixes.length)]}${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;
}

// 生成随机URL
function randomUrl(): string {
  const sites = ['github.com', 'gitlab.com', 'bitbucket.org', 'coding.net', 'gitee.com'];
  const projectName = Math.random().toString(36).substring(7);
  return `https://${sites[Math.floor(Math.random() * sites.length)]}/${projectName}`;
}

async function add5Records() {
  separator('🚀 添加5条测试记录');
  
  try {
    const { sdk } = await initAndLogin();
    
    // 从URL中提取ID
    const baseId = '04b49441-680e-43f9-b324-ac306260dd60';
    const tableId = 'tbl_1Rgpmhpf2tmZKd57ItH96';
    const viewId = 'viw_6HPHUipOzzsPNr3LGVtBL';
    
    log(`\n📊 目标表格信息:`);
    log(`  Base ID: ${baseId}`);
    log(`  Table ID: ${tableId}`);
    log(`  View ID: ${viewId}`);
    
    // 获取当前表格信息
    const table = await sdk.getTable(tableId);
    log(`\n📋 当前表格: ${table.name}`);
    
    // 获取现有字段
    const existingFields = await sdk.listFields({ tableId });
    log(`  现有字段数量: ${existingFields.length}`);
    
    // ========================================
    // 添加5条测试记录
    // ========================================
    log('\n📝 添加5条测试记录...');
    
    const records = [];
    
    for (let i = 0; i < 5; i++) {
      const data = generateRandomData();
      
      const recordData = {
        name: data.name,
        '年龄': data.age,
        '薪资': data.salary,
        '工作状态': data.status,
        '技能标签': data.tags,
        '入职日期': data.joinDate,
        '是否激活': data.isActive,
        '绩效评分': data.rating,
        '邮箱': randomEmail(data.name),
        '电话': randomPhone(),
        '个人网站': randomUrl(),
      };
      
      records.push(recordData);
      log(`  📝 记录 ${i + 1}: ${data.name} (${data.status}, ${data.age}岁, ${data.salary}元)`);
    }
    
    // 批量创建记录
    const createdRecords = await sdk.bulkCreateRecords(tableId, records);
    log(`\n✅ 成功创建 ${createdRecords.length} 条记录`);
    
    // 显示创建的记录详情
    log('\n📋 创建的记录详情:');
    createdRecords.forEach((record, index) => {
      const data = record.data as any;
      log(`  ${index + 1}. ${data.name} - ${data['工作状态']} - ${data['年龄']}岁 - ${data['薪资']}元`);
    });
    
    // ========================================
    // 显示最终统计
    // ========================================
    log('\n📊 最终统计:');
    const finalRecords = await sdk.listRecords({ tableId, limit: 1 });
    
    log(`  总记录数: ${finalRecords.total}`);
    log(`  表格ID: ${tableId}`);
    log(`  视图ID: ${viewId}`);
    
    log('\n🎉 5条测试记录添加完成！');
    log(`   访问: http://localhost:5173/base/${baseId}/${tableId}/${viewId}`);
    
  } catch (err) {
    error('添加测试记录失败:', err);
    throw err;
  }
}

// 运行脚本
if (require.main === module) {
  add5Records()
    .then(() => {
      log('\n✅ 脚本执行完成');
      process.exit(0);
    })
    .catch((err) => {
      error('脚本执行失败:', err);
      process.exit(1);
    });
}

export { add5Records };

