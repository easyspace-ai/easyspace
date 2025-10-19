import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    open: true,
  },
  resolve: {
    preserveSymlinks: true,
    alias: {
      // 使用源码直接开发（热更新）
      '@luckdb/aitable': path.resolve(__dirname, '../src/index.ts'),
      '@luckdb/sdk': path.resolve(__dirname, '../../sdk/src/index.ts'),
      // CSS 文件别名
      '@luckdb/aitable/src/styles/index.css': path.resolve(__dirname, '../src/styles/index.css'),
    },
  },
  optimizeDeps: {
    exclude: ['@luckdb/aitable', '@luckdb/sdk'],
  },
  define: {
    global: 'globalThis',
  },
  build: {
    rollupOptions: {
      external: [],
    },
  },
});
