import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  server: { port: 5174 },
  resolve: {
    preserveSymlinks: true,
    alias: {
      '@luckdb/aitable': path.resolve(__dirname, '../../src/index.ts'),
    },
  },
  optimizeDeps: {
    exclude: ['@luckdb/aitable'],
  },
  // 允许上层源码被 Vite 直接加载
  build: {},
  root: '.',
  publicDir: 'public',
});
