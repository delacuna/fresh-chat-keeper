import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  test: {
    include: ['tests/**/*.{test,spec}.ts', 'src/**/*.{test,spec}.ts'],
    passWithNoTests: true,
  },
  resolve: {
    alias: {
      // 知識ベースの JSON データへの path alias。
      // chrome-ext と同じ alias 名でテスト時のスナップショット実装が解決可能になる。
      '@kb-data': resolve(__dirname, '../knowledge-base/data'),
    },
  },
});
