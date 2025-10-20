import LuckDB from '@easyspace/sdk';

// 创建 SDK 实例
export const luckdb = new LuckDB({
  baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:8080',
  debug: true
});

export default luckdb;