/**
 * normalizeKana 単体テスト。
 * Stage 1 / Stage 2 の判定でカナ・全角半角の揺れを吸収する基幹ユーティリティ。
 * リグレッション保護として網羅的にカバーする。
 */

import { describe, it, expect } from 'vitest';
import { normalizeKana } from '../src/normalizeKana.js';

describe('normalizeKana', () => {
  describe('NFKC 正規化', () => {
    it('半角カナ → 全角カナ', () => {
      expect(normalizeKana('ﾈﾀﾊﾞﾚ')).toBe('ネタバレ');
    });

    it('全角英数 → 半角英数', () => {
      expect(normalizeKana('ＡＢＣ')).toBe('abc');
    });

    it('全角英数とアルファベット混在', () => {
      expect(normalizeKana('ＤＬ-６号事件')).toBe('dl-6号事件');
    });
  });

  describe('ひらがな → カタカナ', () => {
    it('全ひらがなのフレーズ', () => {
      expect(normalizeKana('ねたばれ')).toBe('ネタバレ');
    });

    it('ひらがな + カタカナ + 漢字 混在', () => {
      expect(normalizeKana('やまのは犯人')).toBe('ヤマノハ犯人');
    });

    it('ぁ (U+3041) と ゖ (U+3096) の境界値', () => {
      expect(normalizeKana('ぁゖ')).toBe('ァヶ');
    });

    it('カタカナはそのまま', () => {
      expect(normalizeKana('カタカナ')).toBe('カタカナ');
    });
  });

  describe('英字小文字化', () => {
    it('大文字 → 小文字', () => {
      expect(normalizeKana('SPOILER')).toBe('spoiler');
    });

    it('混在', () => {
      expect(normalizeKana('GameOver')).toBe('gameover');
    });
  });

  describe('変換の境界', () => {
    it('漢字部分はそのまま、ひらがな部分はカタカナ化', () => {
      // 「裏切り者」の「り」(U+308A) はひらがななのでカタカナ「リ」になる
      expect(normalizeKana('裏切り者')).toBe('裏切リ者');
    });

    it('全角記号も NFKC で半角化される（！→! / ？→?）', () => {
      // NFKC 正規化により全角記号は半角化される。「〜」(U+301C) は対応する半角がないため保持
      expect(normalizeKana('！？〜')).toBe('!?〜');
    });

    it('空文字 → 空文字', () => {
      expect(normalizeKana('')).toBe('');
    });
  });
});
