import { defineConfig } from 'vitest/config';

/**
 * proxy のテスト戦略:
 *
 * - リクエスト正規化（旧/新形式 → 統一表現）と verdict マッピングは
 *   `tests/normalize-request.test.ts` で網羅的にカバー（30件）
 * - Anthropic API への実通信を含む `judgeBatch` / `handleJudge` の HTTP/レート制限
 *   経路は **wrangler dev 上の手動テストでカバー** している（PROXY-01 完了時に
 *   旧/新両形式の curl で動作確認済み）
 *
 * カバレッジ全体は ~45% に留まるが、これは Cloudflare Workers の fetch グローバル
 * を vitest 単体で再現するコストに対して得られる安心感が小さいためで、意図的な選択。
 * 将来 miniflare ベースの統合テストを導入する場合に拡張余地あり。
 */
export default defineConfig({
  test: {
    include: ['tests/**/*.{test,spec}.ts'],
    passWithNoTests: true,
  },
});
