import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.{test,spec}.ts', 'src/**/*.{test,spec}.ts'],
    passWithNoTests: true,
    coverage: {
      // 純粋な型定義・再エクスポート（barrel）はカバレッジ対象外
      exclude: ['src/index.ts', 'src/types.ts', '**/*.d.ts', 'dist/**', 'node_modules/**'],
    },
  },
});
