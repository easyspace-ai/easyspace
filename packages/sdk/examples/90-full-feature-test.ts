/**
 * 全功能测试脚本
 * - 创建随机空间、Base、3张表
 * - 每张表包含所有支持的字段类型
 * - 填充100条测试数据
 * - 不删除数据，保留用于测试
 */
import { initAndLogin, log, error, separator, randomName } from './common';

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
  
  return {
    firstName: firstNames[Math.floor(Math.random() * firstNames.length)],
    lastName: lastNames[Math.floor(Math.random() * lastNames.length)],
    city: cities[Math.floor(Math.random() * cities.length)],
    company: companies[Math.floor(Math.random() * companies.length)],
    department: departments[Math.floor(Math.random() * departments.length)],
    position: positions[Math.floor(Math.random() * positions.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    priority: priorities[Math.floor(Math.random() * priorities.length)],
    tags: tags.slice(0, Math.floor(Math.random() * 3) + 1),
  };
}

// 生成随机日期
function randomDate(start: Date, end: Date): string {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString();
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
  return `https://${sites[Math.floor(Math.random() * sites.length)]}/${randomName('project')}`;
}

async function fullFeatureTest() {
  separator('🚀 全功能测试开始');
  
  try {
    const { sdk } = await initAndLogin();
    
    // ========================================
    // 第一步：创建空间
    // ========================================
    log('\n📦 第1步：创建测试空间');
    const spaceName = randomName('全功能测试空间');
    const space = await sdk.createSpace({
      name: spaceName,
      description: '包含所有字段类型的全功能测试空间，用于系统功能验证',
    });
    log(`✅ 创建空间成功: ${space.name}`, { id: space.id });
    
    // ========================================
    // 第二步：创建Base
    // ========================================
    log('\n📊 第2步：创建Base');
    const baseName = randomName('全功能测试Base');
    const base = await sdk.createBase({
      spaceId: space.id,
      name: baseName,
      icon: '🎯',
    });
    log(`✅ 创建Base成功: ${base.name}`, { id: base.id });
    
    // ========================================
    // 第三步：创建表1 - 员工信息表（包含所有基础字段）
    // ========================================
    log('\n📋 第3步：创建表1 - 员工信息表');
    const employeeTable = await sdk.createTable({
      baseId: base.id,
      name: '员工信息表',
      description: '包含所有基础字段类型的员工信息管理表',
    });
    log(`✅ 创建表成功: ${employeeTable.name}`, { id: employeeTable.id });
    
    // 创建字段
    log('\n  创建字段...');
    
    // 1. 单行文本
    const nameField = await sdk.createField({
      tableId: employeeTable.id,
      name: '姓名',
      type: 'singleLineText',
      required: true,
    });
    log(`  ✓ 单行文本字段: ${nameField.name}`);
    
    // 2. 长文本
    const bioField = await sdk.createField({
      tableId: employeeTable.id,
      name: '个人简介',
      type: 'longText',
    });
    log(`  ✓ 长文本字段: ${bioField.name}`);
    
    // 3. 数字
    const ageField = await sdk.createField({
      tableId: employeeTable.id,
      name: '年龄',
      type: 'number',
      options: {
        precision: 0,
      },
    });
    log(`  ✓ 数字字段: ${ageField.name}`);
    
    // 4. 单选
    const statusField = await sdk.createField({
      tableId: employeeTable.id,
      name: '状态',
      type: 'singleSelect',
      options: {
        choices: [
          { id: 'active', name: '在职', color: '#22c55e' },
          { id: 'trial', name: '试用期', color: '#3b82f6' },
          { id: 'leave', name: '离职', color: '#ef4444' },
          { id: 'vacation', name: '休假', color: '#f59e0b' },
          { id: 'business', name: '出差', color: '#8b5cf6' },
        ],
      },
    });
    log(`  ✓ 单选字段: ${statusField.name}`);
    
    // 5. 多选
    const skillsField = await sdk.createField({
      tableId: employeeTable.id,
      name: '技能标签',
      type: 'multipleSelects',
      options: {
        choices: [
          { id: 'frontend', name: '前端开发', color: '#3b82f6' },
          { id: 'backend', name: '后端开发', color: '#22c55e' },
          { id: 'design', name: '设计', color: '#f59e0b' },
          { id: 'product', name: '产品', color: '#8b5cf6' },
          { id: 'operation', name: '运营', color: '#ec4899' },
          { id: 'management', name: '管理', color: '#ef4444' },
        ],
      },
    });
    log(`  ✓ 多选字段: ${skillsField.name}`);
    
    // 6. 日期
    const hireDateField = await sdk.createField({
      tableId: employeeTable.id,
      name: '入职日期',
      type: 'date',
      options: {
        format: 'YYYY-MM-DD',
        includeTime: false,
      },
    });
    log(`  ✓ 日期字段: ${hireDateField.name}`);
    
    // 7. 复选框
    const activeField = await sdk.createField({
      tableId: employeeTable.id,
      name: '是否激活',
      type: 'checkbox',
    });
    log(`  ✓ 复选框字段: ${activeField.name}`);
    
    // 8. URL
    const websiteField = await sdk.createField({
      tableId: employeeTable.id,
      name: '个人网站',
      type: 'url',
    });
    log(`  ✓ URL字段: ${websiteField.name}`);
    
    // 9. 邮箱
    const emailField = await sdk.createField({
      tableId: employeeTable.id,
      name: '邮箱',
      type: 'email',
    });
    log(`  ✓ 邮箱字段: ${emailField.name}`);
    
    // 10. 电话
    const phoneField = await sdk.createField({
      tableId: employeeTable.id,
      name: '电话',
      type: 'phone',
    });
    log(`  ✓ 电话字段: ${phoneField.name}`);
    
    // 11. 评分
    const performanceField = await sdk.createField({
      tableId: employeeTable.id,
      name: '绩效评分',
      type: 'rating',
      options: {
        max: 5,
        icon: '⭐',
      },
    });
    log(`  ✓ 评分字段: ${performanceField.name}`);
    
    log(`\n✅ 员工信息表创建完成，共 ${11} 个字段`);
    
    // ========================================
    // 第四步：创建表2 - 项目管理表
    // ========================================
    log('\n📋 第4步：创建表2 - 项目管理表');
    const projectTable = await sdk.createTable({
      baseId: base.id,
      name: '项目管理表',
      description: '项目任务和进度管理',
    });
    log(`✅ 创建表成功: ${projectTable.name}`, { id: projectTable.id });
    
    log('\n  创建字段...');
    
    const projectNameField = await sdk.createField({
      tableId: projectTable.id,
      name: '项目名称',
      type: 'singleLineText',
      required: true,
    });
    
    const projectDescField = await sdk.createField({
      tableId: projectTable.id,
      name: '项目描述',
      type: 'longText',
    });
    
    const budgetField = await sdk.createField({
      tableId: projectTable.id,
      name: '预算_万元',
      type: 'number',
      options: {
        precision: 2,
      },
    });
    
    const projectStatusField = await sdk.createField({
      tableId: projectTable.id,
      name: '项目状态',
      type: 'singleSelect',
      options: {
        choices: [
          { id: 'planning', name: '规划中', color: '#94a3b8' },
          { id: 'inprogress', name: '进行中', color: '#3b82f6' },
          { id: 'testing', name: '测试中', color: '#f59e0b' },
          { id: 'completed', name: '已完成', color: '#22c55e' },
          { id: 'cancelled', name: '已取消', color: '#ef4444' },
        ],
      },
    });
    
    const priorityField = await sdk.createField({
      tableId: projectTable.id,
      name: '优先级',
      type: 'singleSelect',
      options: {
        choices: [
          { id: 'low', name: '低', color: '#94a3b8' },
          { id: 'medium', name: '中', color: '#3b82f6' },
          { id: 'high', name: '高', color: '#f59e0b' },
          { id: 'urgent', name: '紧急', color: '#ef4444' },
        ],
      },
    });
    
    const startDateField = await sdk.createField({
      tableId: projectTable.id,
      name: '开始日期',
      type: 'date',
      options: {
        format: 'YYYY-MM-DD',
        includeTime: false,
      },
    });
    
    const endDateField = await sdk.createField({
      tableId: projectTable.id,
      name: '结束日期',
      type: 'date',
      options: {
        format: 'YYYY-MM-DD',
        includeTime: false,
      },
    });
    
    const isUrgentField = await sdk.createField({
      tableId: projectTable.id,
      name: '是否紧急',
      type: 'checkbox',
    });
    
    const projectUrlField = await sdk.createField({
      tableId: projectTable.id,
      name: '项目链接',
      type: 'url',
    });
    
    const progressField = await sdk.createField({
      tableId: projectTable.id,
      name: '进度评分',
      type: 'rating',
      options: {
        max: 10,
        icon: '⭐',
      },
    });
    
    log(`\n✅ 项目管理表创建完成，共 ${10} 个字段`);
    
    // ========================================
    // 第五步：创建表3 - 客户信息表
    // ========================================
    log('\n📋 第5步：创建表3 - 客户信息表');
    const customerTable = await sdk.createTable({
      baseId: base.id,
      name: '客户信息表',
      description: '客户关系管理',
    });
    log(`✅ 创建表成功: ${customerTable.name}`, { id: customerTable.id });
    
    log('\n  创建字段...');
    
    const companyNameField = await sdk.createField({
      tableId: customerTable.id,
      name: '公司名称',
      type: 'singleLineText',
      required: true,
    });
    
    const companyDescField = await sdk.createField({
      tableId: customerTable.id,
      name: '公司介绍',
      type: 'longText',
    });
    
    const employeeCountField = await sdk.createField({
      tableId: customerTable.id,
      name: '员工人数',
      type: 'number',
      options: {
        precision: 0,
      },
    });
    
    const industryField = await sdk.createField({
      tableId: customerTable.id,
      name: '行业',
      type: 'singleSelect',
      options: {
        choices: [
          { id: 'tech', name: '科技', color: '#3b82f6' },
          { id: 'finance', name: '金融', color: '#22c55e' },
          { id: 'education', name: '教育', color: '#f59e0b' },
          { id: 'healthcare', name: '医疗', color: '#ef4444' },
          { id: 'retail', name: '零售', color: '#8b5cf6' },
          { id: 'manufacturing', name: '制造', color: '#ec4899' },
        ],
      },
    });
    
    const tagsField = await sdk.createField({
      tableId: customerTable.id,
      name: '客户标签',
      type: 'multipleSelects',
      options: {
        choices: [
          { id: 'vip', name: 'VIP客户', color: '#f59e0b' },
          { id: 'potential', name: '潜在客户', color: '#3b82f6' },
          { id: 'partner', name: '合作伙伴', color: '#22c55e' },
          { id: 'inactive', name: '不活跃', color: '#94a3b8' },
          { id: 'churned', name: '已流失', color: '#ef4444' },
        ],
      },
    });
    
    const createDateField = await sdk.createField({
      tableId: customerTable.id,
      name: '创建日期',
      type: 'date',
      options: {
        format: 'YYYY-MM-DD HH:mm:ss',
        includeTime: true,
      },
    });
    
    const isActiveField = await sdk.createField({
      tableId: customerTable.id,
      name: '是否活跃',
      type: 'checkbox',
    });
    
    const companyWebsiteField = await sdk.createField({
      tableId: customerTable.id,
      name: '公司官网',
      type: 'url',
    });
    
    const contactEmailField = await sdk.createField({
      tableId: customerTable.id,
      name: '联系邮箱',
      type: 'email',
    });
    
    const contactPhoneField = await sdk.createField({
      tableId: customerTable.id,
      name: '联系电话',
      type: 'phone',
    });
    
    const satisfactionField = await sdk.createField({
      tableId: customerTable.id,
      name: '满意度',
      type: 'rating',
      options: {
        max: 5,
        icon: '⭐',
      },
    });
    
    log(`\n✅ 客户信息表创建完成，共 ${11} 个字段`);
    
    // ========================================
    // 第六步：填充数据
    // ========================================
    separator('📝 开始填充测试数据（每张表100条）');
    
    // 填充员工信息表
    log('\n📊 填充员工信息表...');
    const employeeRecords = [];
    for (let i = 0; i < 100; i++) {
      const data = generateRandomData();
      const fullName = `${data.firstName}${data.lastName}`;
      
      const record = await sdk.createRecord({
        tableId: employeeTable.id,
        data: {
          [nameField.name]: fullName,
          [bioField.name]: `我是${fullName}，来自${data.city}，在${data.company}担任${data.position}。`,
          [ageField.name]: 20 + Math.floor(Math.random() * 40),
          [statusField.name]: data.status,
          [skillsField.name]: data.tags.slice(0, 2),
          [hireDateField.name]: randomDate(new Date(2015, 0, 1), new Date()),
          [activeField.name]: Math.random() > 0.2,
          [websiteField.name]: randomUrl(),
          [emailField.name]: randomEmail(fullName),
          [phoneField.name]: randomPhone(),
          [performanceField.name]: Math.floor(Math.random() * 5) + 1,
        },
      });
      employeeRecords.push(record);
      
      if ((i + 1) % 10 === 0) {
        log(`  已创建 ${i + 1}/100 条记录`);
      }
    }
    log(`✅ 员工信息表数据填充完成: ${employeeRecords.length} 条记录`);
    
    // 填充项目管理表
    log('\n📊 填充项目管理表...');
    const projectRecords = [];
    const projectNames = ['电商平台升级', '移动应用开发', '数据中台建设', 'AI系统研发', '云平台迁移', '营销系统', '客服系统', '财务系统', '人事系统', 'OA系统'];
    
    for (let i = 0; i < 100; i++) {
      const projectName = `${projectNames[i % projectNames.length]}-${Math.floor(i / projectNames.length) + 1}期`;
      const startDate = randomDate(new Date(2023, 0, 1), new Date());
      const endDate = randomDate(new Date(startDate), new Date(2025, 11, 31));
      
      const record = await sdk.createRecord({
        tableId: projectTable.id,
        data: {
          [projectNameField.name]: projectName,
          [projectDescField.name]: `${projectName}的详细描述，包含需求分析、技术选型、开发实施等内容。`,
          [budgetField.name]: (Math.random() * 500 + 50).toFixed(2),
          [projectStatusField.name]: ['planning', 'inprogress', 'testing', 'completed', 'cancelled'][Math.floor(Math.random() * 5)],
          [priorityField.name]: ['low', 'medium', 'high', 'urgent'][Math.floor(Math.random() * 4)],
          [startDateField.name]: startDate,
          [endDateField.name]: endDate,
          [isUrgentField.name]: Math.random() > 0.7,
          [projectUrlField.name]: randomUrl(),
          [progressField.name]: Math.floor(Math.random() * 10) + 1,
        },
      });
      projectRecords.push(record);
      
      if ((i + 1) % 10 === 0) {
        log(`  已创建 ${i + 1}/100 条记录`);
      }
    }
    log(`✅ 项目管理表数据填充完成: ${projectRecords.length} 条记录`);
    
    // 填充客户信息表
    log('\n📊 填充客户信息表...');
    const customerRecords = [];
    const data = generateRandomData();
    
    for (let i = 0; i < 100; i++) {
      const companyName = `${data.company}科技有限公司-${i + 1}`;
      
      const record = await sdk.createRecord({
        tableId: customerTable.id,
        data: {
          [companyNameField.name]: companyName,
          [companyDescField.name]: `${companyName}是一家专注于${data.department}领域的创新型企业，致力于提供优质的产品和服务。`,
          [employeeCountField.name]: Math.floor(Math.random() * 5000) + 10,
          [industryField.name]: ['tech', 'finance', 'education', 'healthcare', 'retail', 'manufacturing'][Math.floor(Math.random() * 6)],
          [tagsField.name]: data.tags.slice(0, 2),
          [createDateField.name]: randomDate(new Date(2020, 0, 1), new Date()),
          [isActiveField.name]: Math.random() > 0.3,
          [companyWebsiteField.name]: `https://www.${companyName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}.com`,
          [contactEmailField.name]: randomEmail('contact'),
          [contactPhoneField.name]: randomPhone(),
          [satisfactionField.name]: Math.floor(Math.random() * 5) + 1,
        },
      });
      customerRecords.push(record);
      
      if ((i + 1) % 10 === 0) {
        log(`  已创建 ${i + 1}/100 条记录`);
      }
    }
    log(`✅ 客户信息表数据填充完成: ${customerRecords.length} 条记录`);
    
    // ========================================
    // 第七步：汇总信息
    // ========================================
    separator('📊 测试环境创建完成');
    
    log('\n✅ 全功能测试环境已成功创建！');
    log('\n📍 环境信息：');
    log(`  空间: ${space.name} (${space.id})`);
    log(`  Base: ${base.name} (${base.id})`);
    log(`\n📋 表格信息：`);
    log(`  1. ${employeeTable.name} (${employeeTable.id})`);
    log(`     - 字段数: 11`);
    log(`     - 记录数: ${employeeRecords.length}`);
    log(`     - 字段类型: 单行文本, 长文本, 数字, 单选, 多选, 日期, 复选框, URL, 邮箱, 电话, 评分`);
    
    log(`\n  2. ${projectTable.name} (${projectTable.id})`);
    log(`     - 字段数: 10`);
    log(`     - 记录数: ${projectRecords.length}`);
    log(`     - 字段类型: 单行文本, 长文本, 数字, 单选, 日期, 复选框, URL, 评分`);
    
    log(`\n  3. ${customerTable.name} (${customerTable.id})`);
    log(`     - 字段数: 11`);
    log(`     - 记录数: ${customerRecords.length}`);
    log(`     - 字段类型: 单行文本, 长文本, 数字, 单选, 多选, 日期, 复选框, URL, 邮箱, 电话, 评分`);
    
    log(`\n📈 总计：`);
    log(`  - 3张表`);
    log(`  - 32个字段`);
    log(`  - ${employeeRecords.length + projectRecords.length + customerRecords.length} 条记录`);
    
    log('\n💡 提示: 数据已保留，可用于后续测试');
    
    separator('✅ 全功能测试完成');
    
  } catch (err) {
    error('全功能测试失败', err);
    throw err;
  }
}

// 运行测试
fullFeatureTest()
  .then(() => {
    console.log('\n🎉 全功能测试环境创建成功！');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ 测试失败:', err);
    process.exit(1);
  });

