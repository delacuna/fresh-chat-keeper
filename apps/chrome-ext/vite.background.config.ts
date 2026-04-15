import { defineConfig } from 'vite';
import { resolve } from 'path';

/**
 * Background Service Worker ビルド設定
 *
 * Service Worker も IIFE 形式でビルドする。
 * （ES モジュール形式にする場合は manifest.json に "type": "module" が必要）
 */
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    minify: false,
    lib: {
      entry: resolve(__dirname, 'src/background/service-worker.ts'),
      formats: ['iife'],
      name: 'FreshLiveChatBackground',
      fileName: () => 'background.js',
    },
  },
  resolve: {
    alias: [
      {
        find: '@fresh-live-chat/shared',
        replacement: resolve(__dirname, '../../packages/shared/src/index.ts'),
      },
    ],
  },
});
