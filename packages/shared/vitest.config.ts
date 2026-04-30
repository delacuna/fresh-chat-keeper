import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.{test,spec}.ts', 'src/**/*.{test,spec}.ts'],
    passWithNoTests: true,
    coverage: {
      // 純粋な型定義・再エクスポート・barrel ファイルはカバレッジ対象外
      // （実行時コードがほぼ無く、テストする意味がない）
      exclude: ['src/index.ts', 'src/types/**', '**/*.d.ts', 'dist/**', 'node_modules/**'],
    },
  },
});
