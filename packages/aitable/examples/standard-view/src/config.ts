/**
 * 应用配置
 * 用于配置 LuckDB 连接参数
 */

export interface AppConfig {
  // 服务器配置
  baseURL: string;
  
  // 认证配置
  token?: string;
  
  // 表格配置
  tableId?: string;
  
  // 其他配置
  autoLoad?: boolean;
  limit?: number;
}

/**
 * 默认配置
 * 在实际应用中，这些配置应该来自环境变量或配置文件
 */
export const defaultConfig: AppConfig = {
  // 默认使用本地开发服务器
  baseURL: process.env.REACT_APP_LUCKDB_URL || 'http://localhost:8080',
  
  // 需要用户登录后获取
  token: process.env.REACT_APP_LUCKDB_TOKEN,
  
  // 需要用户选择表格后设置
  tableId: process.env.REACT_APP_LUCKDB_TABLE_ID,
  
  // 其他默认配置
  autoLoad: true,
  limit: 100,
};

/**
 * 获取配置
 * 优先使用环境变量，然后是默认配置
 */
export function getConfig(): AppConfig {
  return {
    ...defaultConfig,
    // 可以在这里添加从 localStorage 或其他地方读取配置的逻辑
  };
}

/**
 * 验证配置
 * 检查必要的配置项是否已设置
 */
export function validateConfig(config: AppConfig): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.baseURL) {
    errors.push('baseURL 不能为空');
  }

  if (!config.token) {
    errors.push('token 不能为空，请先登录获取认证令牌');
  }

  if (!config.tableId) {
    errors.push('tableId 不能为空，请选择要查看的表格');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 配置帮助信息
 */
export const configHelp = {
  title: '配置 LuckDB 连接',
  steps: [
    {
      title: '1. 启动 LuckDB 服务器',
      description: '确保 LuckDB 服务器正在运行，默认地址为 http://localhost:8080',
      code: 'npm run server  # 或相应的启动命令',
    },
    {
      title: '2. 获取认证令牌',
      description: '登录 LuckDB 获取访问令牌',
      code: `curl -X POST http://localhost:8080/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email": "your-email", "password": "your-password"}'`,
    },
    {
      title: '3. 获取表格 ID',
      description: '获取要查看的表格 ID',
      code: `curl -X GET http://localhost:8080/api/v1/base/{baseId}/table \\
  -H "Authorization: Bearer {your-token}"`,
    },
    {
      title: '4. 设置环境变量',
      description: '在 .env 文件中设置配置',
      code: `REACT_APP_LUCKDB_URL=http://localhost:8080
REACT_APP_LUCKDB_TOKEN=your-access-token
REACT_APP_LUCKDB_TABLE_ID=your-table-id`,
    },
  ],
};
