import { defineConfig } from 'vite';
import { resolve } from 'path';

/**
 * Content Script ビルド設定
 *
 * format: 'iife' を使用することで、全依存が1ファイルにインライン化される。
 * Chrome の content_scripts は ES モジュールの import 文を解釈できないため、
 * IIFE 形式（即時実行関数）にバンドルする必要がある。
 */
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    minify: false,
    lib: {
      entry: resolve(__dirname, 'src/content/index.ts'),
      formats: ['iife'],
      name: 'FreshLiveChatContent',
      fileName: () => 'content.js',
    },
  },
  resolve: {
    alias: [
      {
        find: '@fresh-live-chat/shared',
        replacement: resolve(__dirname, '../../packages/shared/src/index.ts'),
      },
      {
        find: '@fresh-live-chat/knowledge-base',
        replacement: resolve(__dirname, '../../packages/knowledge-base/src/index.ts'),
      },
      {
        find: '@kb-data',
        replacement: resolve(__dirname, '../../packages/knowledge-base/data'),
      },
    ],
  },
});
