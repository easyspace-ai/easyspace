import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // 统一的包别名
      '@easyspace/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@easyspace/aitable': path.resolve(__dirname, '../../packages/aitable/src'),
      '@easyspace/sdk': path.resolve(__dirname, '../../packages/sdk/src'),
    },
  },
  optimizeDeps: {
    include: ['@easyspace/aitable', '@easyspace/sdk', '@easyspace/ui'],
    exclude: ['react-hammerjs'],
  },
  server: {
    port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  base: process.env.VITE_BASENAME || '/',
});
