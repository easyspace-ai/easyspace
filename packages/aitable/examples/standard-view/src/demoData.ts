import type { IGridColumn } from "@luckdb/aitable";
import { CellType } from "@luckdb/aitable";

/**
 * 演示数据生成器
 * 
 * 设计理念：
 * - 真实场景：模拟项目管理工具的数据
 * - 多样性：涵盖所有主要字段类型
 * - 数据量：200+行，测试性能和滚动
 * - 变化性：不同状态、不同数值范围
 */

// 项目名称池
const PROJECT_NAMES = [
  "用户管理系统重构", "API性能优化", "前端组件库升级", "数据库迁移",
  "移动端适配", "支付系统集成", "搜索功能增强", "权限系统重构",
  "微服务拆分", "CI/CD流水线优化", "监控系统搭建", "缓存策略优化",
  "文档中心建设", "测试覆盖率提升", "代码质量改进", "安全漏洞修复",
  "多语言支持", "主题系统开发", "日志系统完善", "性能监控平台",
  "消息推送系统", "文件上传优化", "图片处理服务", "视频流媒体",
  "实时聊天功能", "协同编辑系统", "工作流引擎", "报表系统",
  "数据可视化", "机器学习集成", "AI助手开发", "区块链集成",
];

const TEAM_MEMBERS = [
  "张三", "李四", "王五", "赵六", "钱七", "孙八",
  "周九", "吴十", "郑十一", "冯十二", "陈十三", "卫十四",
];

const TAGS = [
  "紧急", "重要", "优化", "重构", "新功能", "Bug修复",
  "技术债", "用户体验", "性能", "安全", "文档", "测试",
];

const PRIORITIES = ["低", "中", "高", "紧急"];
const STATUSES = ["待处理", "进行中", "已完成", "已暂停", "已取消"];
const DEPARTMENTS = ["前端", "后端", "测试", "设计", "产品", "运维"];

// 生成随机日期
function randomDate(start: Date, end: Date): string {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().split('T')[0];
}

// 生成随机邮箱
function randomEmail(name: string): string {
  const domains = ["company.com", "team.io", "project.dev"];
  const cleanName = name.replace(/\s+/g, '').toLowerCase();
  return `${cleanName}@${domains[Math.floor(Math.random() * domains.length)]}`;
}

// 生成列定义
export function createDemoColumns(): IGridColumn[] {
  return [
    { id: "id", name: "ID", width: 80, isPrimary: true },
    { id: "project", name: "项目名称", width: 200 },
    { id: "status", name: "状态", width: 120 },
    { id: "priority", name: "优先级", width: 100 },
    { id: "assignee", name: "负责人", width: 120 },
    { id: "department", name: "部门", width: 100 },
    { id: "progress", name: "进度", width: 100 },
    { id: "estimate", name: "预估工时(h)", width: 120 },
    { id: "actual", name: "实际工时(h)", width: 120 },
    { id: "startDate", name: "开始日期", width: 130 },
    { id: "endDate", name: "截止日期", width: 130 },
    { id: "tags", name: "标签", width: 180 },
    { id: "description", name: "描述", width: 300 },
    { id: "email", name: "联系邮箱", width: 200 },
    { id: "url", name: "文档链接", width: 250 },
  ];
}

// 生成单元格内容
export function getDemoCellContent(cell: [number, number], columns: IGridColumn[]) {
  const [col, row] = cell;
  
  // 边界检查
  if (col < 0 || row < 0 || col >= columns.length) {
    return { 
      type: CellType.Text, 
      data: "", 
      displayData: "" 
    };
  }
  
  const column = columns[col];
  if (!column) {
    return { 
      type: CellType.Text, 
      data: "", 
      displayData: "" 
    };
  }

  // 根据列ID生成对应的单元格数据
  switch (column.id) {
    case "id":
      return {
        type: CellType.Text,
        data: `TASK-${String(row + 1).padStart(4, '0')}`,
        displayData: `TASK-${String(row + 1).padStart(4, '0')}`,
      };

    case "project": {
      const projectIndex = row % PROJECT_NAMES.length;
      const projectName = PROJECT_NAMES[projectIndex];
      return {
        type: CellType.Text,
        data: projectName,
        displayData: projectName,
      };
    }

    case "status": {
      const statusIndex = row % STATUSES.length;
      const status = STATUSES[statusIndex];
      const colorMap: Record<string, string> = {
        "待处理": "#94a3b8",
        "进行中": "#3b82f6",
        "已完成": "#22c55e",
        "已暂停": "#f59e0b",
        "已取消": "#ef4444",
      };
      
      return {
        type: CellType.Select,
        data: [status],
        displayData: [status],
        choiceMap: new Map(
          STATUSES.map(s => [s, { id: s, name: s, color: colorMap[s] || "#64748b" }])
        ),
        choiceSorted: STATUSES.map(s => ({ id: s, name: s, color: colorMap[s] || "#64748b" })),
        isMultiple: false,
      };
    }

    case "priority": {
      const priorityIndex = Math.min(Math.floor(row / 50), PRIORITIES.length - 1);
      const priority = PRIORITIES[priorityIndex];
      const colorMap: Record<string, string> = {
        "低": "#94a3b8",
        "中": "#3b82f6",
        "高": "#f59e0b",
        "紧急": "#ef4444",
      };
      
      return {
        type: CellType.Select,
        data: [priority],
        displayData: [priority],
        choiceMap: new Map(
          PRIORITIES.map(p => [p, { id: p, name: p, color: colorMap[p] || "#64748b" }])
        ),
        choiceSorted: PRIORITIES.map(p => ({ id: p, name: p, color: colorMap[p] || "#64748b" })),
        isMultiple: false,
      };
    }

    case "assignee": {
      const member = TEAM_MEMBERS[row % TEAM_MEMBERS.length];
      return {
        type: CellType.Text,
        data: member,
        displayData: member,
      };
    }

    case "department": {
      const dept = DEPARTMENTS[row % DEPARTMENTS.length];
      const colorMap: Record<string, string> = {
        "前端": "#3b82f6",
        "后端": "#8b5cf6",
        "测试": "#22c55e",
        "设计": "#ec4899",
        "产品": "#f59e0b",
        "运维": "#06b6d4",
      };
      
      return {
        type: CellType.Select,
        data: [dept],
        displayData: [dept],
        choiceMap: new Map(
          DEPARTMENTS.map(d => [d, { id: d, name: d, color: colorMap[d] || "#64748b" }])
        ),
        choiceSorted: DEPARTMENTS.map(d => ({ id: d, name: d, color: colorMap[d] || "#64748b" })),
        isMultiple: false,
      };
    }

    case "progress": {
      const progress = Math.min(Math.floor((row * 13) % 101), 100);
      return {
        type: CellType.Number,
        data: progress,
        displayData: `${progress}%`,
      };
    }

    case "estimate": {
      const estimate = Math.floor((row * 7) % 80) + 8;
      return {
        type: CellType.Number,
        data: estimate,
        displayData: String(estimate),
      };
    }

    case "actual": {
      const estimate = Math.floor((row * 7) % 80) + 8;
      const actual = Math.floor(estimate * (0.8 + Math.random() * 0.4));
      return {
        type: CellType.Number,
        data: actual,
        displayData: String(actual),
      };
    }

    case "startDate": {
      const startDate = randomDate(
        new Date(2024, 0, 1),
        new Date(2024, 11, 31)
      );
      return {
        type: CellType.Text,
        data: startDate,
        displayData: startDate,
      };
    }

    case "endDate": {
      const endDate = randomDate(
        new Date(2024, 6, 1),
        new Date(2025, 5, 30)
      );
      return {
        type: CellType.Text,
        data: endDate,
        displayData: endDate,
      };
    }

    case "tags": {
      const tagCount = (row % 3) + 1;
      const selectedTags: string[] = [];
      for (let i = 0; i < tagCount; i++) {
        const tagIndex = (row + i * 3) % TAGS.length;
        selectedTags.push(TAGS[tagIndex]);
      }
      
      const colorMap: Record<string, string> = {
        "紧急": "#ef4444",
        "重要": "#f59e0b",
        "优化": "#3b82f6",
        "重构": "#8b5cf6",
        "新功能": "#22c55e",
        "Bug修复": "#ef4444",
        "技术债": "#f59e0b",
        "用户体验": "#ec4899",
        "性能": "#06b6d4",
        "安全": "#dc2626",
        "文档": "#64748b",
        "测试": "#22c55e",
      };
      
      return {
        type: CellType.Select,
        data: selectedTags,
        displayData: selectedTags,
        choiceMap: new Map(
          TAGS.map(t => [t, { id: t, name: t, color: colorMap[t] || "#64748b" }])
        ),
        choiceSorted: TAGS.map(t => ({ id: t, name: t, color: colorMap[t] || "#64748b" })),
        isMultiple: true,
      };
    }

    case "description": {
      const projectIndex = row % PROJECT_NAMES.length;
      const descriptions = [
        "完成核心功能开发，包括前后端接口对接和数据验证",
        "优化性能瓶颈，提升响应速度，降低资源消耗",
        "重构老旧代码，提高代码质量和可维护性",
        "修复已知Bug，完善错误处理和边界情况",
        "添加单元测试和集成测试，提升代码覆盖率",
        "完善技术文档，包括API文档和使用指南",
        "优化用户体验，改进交互流程和视觉设计",
        "进行安全审计，修复潜在的安全漏洞",
      ];
      const desc = descriptions[row % descriptions.length];
      return {
        type: CellType.Text,
        data: desc,
        displayData: desc,
      };
    }

    case "email": {
      const member = TEAM_MEMBERS[row % TEAM_MEMBERS.length];
      const email = randomEmail(member);
      return {
        type: CellType.Text,
        data: email,
        displayData: email,
      };
    }

    case "url": {
      const urlTemplates = [
        "https://docs.company.com/project-",
        "https://wiki.team.io/spec-",
        "https://confluence.dev/design-",
      ];
      const template = urlTemplates[row % urlTemplates.length];
      const url = `${template}${row + 1}`;
      return {
        type: CellType.Text,
        data: url,
        displayData: url,
      };
    }

    default:
      return {
        type: CellType.Text,
        data: "",
        displayData: "",
      };
  }
}

/**
 * 生成演示统计信息
 */
export function getDemoStatistics(rowCount: number) {
  const completed = Math.floor(rowCount * 0.35);
  const inProgress = Math.floor(rowCount * 0.40);
  const pending = Math.floor(rowCount * 0.20);
  const others = rowCount - completed - inProgress - pending;

  return {
    total: rowCount,
    completed,
    inProgress,
    pending,
    others,
    completionRate: Math.round((completed / rowCount) * 100),
  };
}


