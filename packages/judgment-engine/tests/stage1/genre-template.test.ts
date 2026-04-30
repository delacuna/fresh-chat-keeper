/**
 * 直接単体テスト（buildActiveGenreTemplates）。
 *
 * `matchesGenreTemplate` 系は regression fixtures でカバーされているが、
 * `buildActiveGenreTemplates`（ID リスト → GenreTemplate[] の構築）は
 * 呼び出し側（chrome-ext archive.ts）でのみ使われ、フィクスチャ範囲外。
 */

import { describe, it, expect } from 'vitest';
import { buildActiveGenreTemplates } from '../../src/stage1/genre-template.js';

describe('buildActiveGenreTemplates', () => {
  it('空配列 → 空配列', () => {
    expect(buildActiveGenreTemplates([])).toEqual([]);
  });

  it('単一 ID → 該当テンプレート1件', () => {
    const result = buildActiveGenreTemplates(['rpg']);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('rpg');
  });

  it('複数 ID → 全件取得', () => {
    const result = buildActiveGenreTemplates(['rpg', 'mystery']);
    expect(result.map((t) => t.id).sort()).toEqual(['mystery', 'rpg']);
  });

  it('未知 ID は黙って除外（filter なのでクラッシュしない）', () => {
    const result = buildActiveGenreTemplates(['rpg', 'unknown-genre']);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('rpg');
  });

  it('全 ID が未知 → 空配列', () => {
    expect(buildActiveGenreTemplates(['ghost', 'phantom'])).toEqual([]);
  });
});
