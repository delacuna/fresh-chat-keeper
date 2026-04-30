/**
 * matchesSpoilerVerb 単体テスト。
 * Stage 1 のキーワード+動詞パターン判定で使用される基幹関数。
 */

import { describe, it, expect } from 'vitest';
import { matchesSpoilerVerb, SPOILER_VERBS } from '../src/spoilerContext.js';

describe('SPOILER_VERBS', () => {
  it('明確な動詞のみを含む（曖昧な「実は」「真相」「犯人は」は意図的に除外）', () => {
    expect(SPOILER_VERBS).toContain('死んだ');
    expect(SPOILER_VERBS).toContain('裏切った');
    expect(SPOILER_VERBS).not.toContain('実は');
    expect(SPOILER_VERBS).not.toContain('犯人は');
  });
});

describe('matchesSpoilerVerb', () => {
  it('「死んだ」を含むテキスト → 該当動詞を返す', () => {
    expect(matchesSpoilerVerb('彼が死んだ')).toBe('死んだ');
  });

  it('「裏切った」を含むテキスト', () => {
    expect(matchesSpoilerVerb('仲間に裏切った人物')).toBe('裏切った');
  });

  it('動詞内のひらがな部分がカナ揺れしてもマッチ（漢字部分は normalizeKana で保持）', () => {
    // 「死んだ」の漢字「死」は元のテキストに必須。ひらがな「ん」「だ」は
    // カタカナ化されるため、入力側のひらがな表記もマッチする。
    expect(matchesSpoilerVerb('彼は死ンダのか')).toBe('死んだ');
  });

  it('動詞を含まないテキスト → null', () => {
    expect(matchesSpoilerVerb('今日は楽しかった')).toBeNull();
  });

  it('全ひらがな表記（漢字を含まない）はマッチしない（仕様）', () => {
    // SPOILER_VERBS が漢字含む形のため、normalizeKana では漢字↔ひらがな変換は
    // 行われない。「しんだ」だけのテキストは「死ンダ」とマッチしない。
    expect(matchesSpoilerVerb('しんだのか')).toBeNull();
  });

  it('「実は」だけでは null（曖昧表現は LLM に委ねる）', () => {
    expect(matchesSpoilerVerb('実はそうなんですよ')).toBeNull();
  });

  it('空文字 → null', () => {
    expect(matchesSpoilerVerb('')).toBeNull();
  });
});
