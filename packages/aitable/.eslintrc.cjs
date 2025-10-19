module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
    project: './tsconfig.json',
  },
  env: {
    browser: true,
    es2020: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    // TypeScript 规则 - 严格模式
    '@typescript-eslint/no-explicit-any': 'error', // 禁止 any，改为 error
    '@typescript-eslint/no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_' 
    }],
    '@typescript-eslint/explicit-module-boundary-types': 'error', // 要求明确返回类型
    '@typescript-eslint/no-non-null-assertion': 'error', // 禁止非空断言
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
    '@typescript-eslint/no-unnecessary-type-assertion': 'error',
    
    // React 规则
    'react/react-in-jsx-scope': 'off', // React 17+ 不需要
    'react/prop-types': 'off', // 使用 TypeScript
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'error', // 改为 error，确保依赖正确
    
    // 通用规则 - 严格模式
    'no-console': process.env.NODE_ENV === 'production' 
      ? ['error', { allow: ['warn', 'error'] }] // 生产环境完全禁止 console.log
      : ['warn', { allow: ['warn', 'error'] }], // 开发环境警告
    'prefer-const': 'error',
    'no-var': 'error',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-alert': 'error',
    
    // 代码质量
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
    'no-eval': 'error',
    'no-implied-eval': 'error',
  },
  ignorePatterns: [
    'dist',
    'node_modules',
    '*.js',
    '!.eslintrc.cjs',
  ],
};

