/**
 * Stage 1 リグレッションテスト（parity test）。
 *
 * 既存 filter.ts (apps/chrome-ext/src/content) から取得した期待値が
 * stage1-fixtures.ts に静的に埋め込まれている。本テストはその期待値に対して
 * 同等のロジックを適用し、Phase 2 移植後も挙動が変わらないことを保証する。
 *
 * P2-STAGE1-01 時点では、judgment-engine 側にまだ Stage 1 実装が無いため、
 * **filter.ts のロジックを直接ここで再実行**して期待値との一致を確認する。
 * これは generator が同じロジックで生成した期待値を再実行で確認するだけの
 * 自己整合チェックだが、フィクスチャ自体が正しく構築・シリアライズされている
 * ことの検証になる。
 *
 * P2-STAGE1-02 以降:
 * - judgment-engine の新実装に同じフィクスチャを通すことで parity を確認する
 * - 本ファイルを差し替える形で新実装に対するテストに変える
 */

import { describe, it, expect } from 'vitest';
import {
  MATCHES_KEYWORD_FIXTURES,
  MATCHES_CUSTOM_NG_WORD_FIXTURES,
  MATCHES_GENRE_TEMPLATE_FIXTURES,
  MATCHES_GAMEPLAY_HINT_FIXTURES,
  MATCHES_GENRE_KEYWORD_FIXTURES,
  MATCHES_KEYWORD_FOR_STAGE2_FIXTURES,
  BUILD_KEYWORD_SET_FIXTURES,
  BUILD_DESCRIPTION_PHRASE_SET_FIXTURES,
} from './stage1-fixtures.js';
import {
  matchesKeyword,
  matchesCustomNGWord,
  matchesGenreTemplate,
  matchesGameplayHintForStage2,
  matchesGenreKeywordForStage2,
  matchesKeywordForStage2,
  buildKeywordSet,
  buildDescriptionPhraseSet,
} from './stage1-impl-snapshot.js';
import { getAllGenreTemplates } from '@fresh-chat-keeper/knowledge-base';

const ALL_GENRES = getAllGenreTemplates();
const templatesByIds = (ids: string[]) => ALL_GENRES.filter((t) => ids.includes(t.id));

describe('Stage 1 parity with filter.ts (v0.2.0 snapshot)', () => {
  describe('A. matchesKeyword', () => {
    it.each(MATCHES_KEYWORD_FIXTURES)('$name', ({ input, expected }) => {
      const result = matchesKeyword(input.text, new Set(input.keywords), new Set(input.descriptionPhrases));
      expect(result).toEqual(expected);
    });
  });

  describe('B. matchesCustomNGWord', () => {
    it.each(MATCHES_CUSTOM_NG_WORD_FIXTURES)('$name', ({ input, expected }) => {
      const result = matchesCustomNGWord(input.text, input.words);
      expect(result).toBe(expected);
    });
  });

  describe('C. matchesGenreTemplate', () => {
    it.each(MATCHES_GENRE_TEMPLATE_FIXTURES)('$name', ({ input, expected }) => {
      const result = matchesGenreTemplate(input.text, templatesByIds(input.templateIds));
      expect(result).toBe(expected);
    });
  });

  describe('D. matchesGameplayHintForStage2', () => {
    it.each(MATCHES_GAMEPLAY_HINT_FIXTURES)('$name', ({ input, expected }) => {
      const result = matchesGameplayHintForStage2(input.text, templatesByIds(input.templateIds));
      expect(result).toBe(expected);
    });
  });

  describe('E. matchesGenreKeywordForStage2', () => {
    it.each(MATCHES_GENRE_KEYWORD_FIXTURES)('$name', ({ input, expected }) => {
      const result = matchesGenreKeywordForStage2(input.text, templatesByIds(input.templateIds));
      expect(result).toBe(expected);
    });
  });

  describe('F. matchesKeywordForStage2', () => {
    it.each(MATCHES_KEYWORD_FOR_STAGE2_FIXTURES)('$name', ({ input, expected }) => {
      const result = matchesKeywordForStage2(input.text, new Set(input.keywords));
      expect(result).toBe(expected);
    });
  });

  describe('G. buildKeywordSet', () => {
    it.each(BUILD_KEYWORD_SET_FIXTURES)('$name', ({ input, expected }) => {
      const result = [...buildKeywordSet(input.gameId, input.filterMode, input.progress)].sort();
      expect(result).toEqual(expected);
    });
  });

  describe('H. buildDescriptionPhraseSet', () => {
    it.each(BUILD_DESCRIPTION_PHRASE_SET_FIXTURES)('$name', ({ input, expected }) => {
      const result = [...buildDescriptionPhraseSet(input.gameId)].sort();
      expect(result).toEqual(expected);
    });
  });
});
