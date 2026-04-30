/**
 * 直接単体テスト（custom-blocklist）。
 * regression fixtures は `matchesCustomNGWord` を網羅するが、
 * `matchCustomBlocklist`（FilterSettings v2 の string[] 用）は
 * runStage1 経由で間接的に呼ばれるだけのため、ここで直接カバーする。
 */

import { describe, it, expect } from 'vitest';
import { matchCustomBlocklist } from '../../src/stage1/custom-blocklist.js';

describe('matchCustomBlocklist', () => {
  it('空配列 → null', () => {
    expect(matchCustomBlocklist('何でも', [])).toBeNull();
  });

  it('マッチしないテキスト → null', () => {
    expect(matchCustomBlocklist('普通のコメント', ['秘密', 'ねたばれ'])).toBeNull();
  });

  it('マッチするワード → 該当ワード文字列を返す', () => {
    expect(matchCustomBlocklist('これは秘密の話', ['秘密'])).toBe('秘密');
  });

  it('カナ正規化マッチ', () => {
    // 'ねたばれ' と 'ネタバレ' は normalizeKana で同一視される
    expect(matchCustomBlocklist('ねたばれ全開', ['ネタバレ'])).toBe('ネタバレ');
  });

  it('複数候補のうち最初にマッチしたものを返す', () => {
    const result = matchCustomBlocklist('AとBの両方を含む', ['A', 'B']);
    expect(result).toBe('A');
  });
});
