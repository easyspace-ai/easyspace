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
      '@easyspace/aitable': path.resolve(__dirname, '../src/index.ts'),
      '@easyspace/sdk': path.resolve(__dirname, '../../sdk/src/index.ts'),
      // CSS 文件别名
      '@easyspace/aitable/src/styles/index.css': path.resolve(__dirname, '../src/styles/index.css'),
    },
  },
  optimizeDeps: {
    exclude: ['@easyspace/aitable', '@easyspace/sdk'],
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
