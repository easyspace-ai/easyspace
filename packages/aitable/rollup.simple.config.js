/**
 * 简化的 Rollup 配置 - 用于测试基本构建功能
 */

import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import postcss from 'rollup-plugin-postcss';
import json from '@rollup/plugin-json';

const external = [
  'react',
  'react-dom',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
  '@easyspace/sdk',
  'reconnecting-websocket',
  'fuse.js',
  'react-use',
  'react-hotkeys-hook',
  'use-file-picker',
  'react-textarea-autosize',
  'ts-keycode-enum',
];

const plugins = [
  peerDepsExternal(),
  json(),
  postcss({
    extract: false,
    modules: false,
    minimize: true,
  }),
  resolve({
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    preferBuiltins: false,
  }),
  commonjs(),
  typescript({
    tsconfig: './tsconfig.build.json',
    declaration: true,
    declarationDir: './dist',
    sourceMap: true,
    jsx: 'react-jsx',
    exclude: [
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      '**/demo/**',
      '**/examples/**',
      '**/__tests__/**',
    ],
  }),
];

export default [
  // CSS 构建
  {
    input: 'src/styles/index.css',
    output: {
      file: 'dist/index.css',
      format: 'es',
    },
    plugins: [
      postcss({
        extract: true,
        modules: false,
        minimize: true,
      }),
    ],
  },
  
  // ESM 构建
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.esm.js',
      format: 'esm',
      sourcemap: true,
      exports: 'named',
    },
    external,
    plugins,
  },
  
  // CJS 构建
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/index.cjs.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
    },
    external,
    plugins,
  },
];
