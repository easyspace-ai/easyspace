/**
 * 测试环境配置
 */
export const config = {
  apiUrl: process.env.API_URL || 'http://localhost:8080',
  testEmail: process.env.TEST_EMAIL || 'admin@126.com',
  testPassword: process.env.TEST_PASSWORD || 'Pmker123',
  debug: true,
};

// 导出方便的访问函数
export function getApiUrl(): string {
  return config.apiUrl;
}

export function getTestCredentials() {
  return {
    email: config.testEmail,
    password: config.testPassword,
  };
}

