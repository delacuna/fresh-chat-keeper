/**
 * Stage 1 実装のスナップショット（リグレッションテスト用）。
 *
 * **このファイルは apps/chrome-ext/src/content/filter.ts の Phase 2 移植時点コピー。**
 * 直接編集しないこと。filter.ts に意図的な変更が入った場合のみ手動で同期する。
 *
 * **検証力に関する重要な注記（トートロジー警告）**:
 * 本ファイルは filter.ts のコピーであり、stage1-fixtures.ts の期待値もまた
 * filter.ts を実行して取得したものである。つまり P2-STAGE1-01 時点では
 * 「フィクスチャ生成元と検証対象が同じソース（filter.ts）」となっており、
 * parity テストが通ることは自明である（トートロジー）。
 *
 * このスナップショット実装が真の検証力を発揮するのは、P2-STAGE1-02 で
 * judgment-engine 側に **独立した新実装** が入り、それを stage1-parity.test.ts の
 * import 先に切り替えた時点。新旧2つの実装が同じフィクスチャに対して
 * 同じ結果を返すことが確認できて初めて、parity 検証として意味を持つ。
 *
 * 目的:
 * - judgment-engine のテストが apps/* を参照しないという依存ルールを保ちつつ、
 *   parity テストの足場（フィクスチャ + テストランナー）を P2-STAGE1-01 段階で
 *   完成させ、P2-STAGE1-02 では import の差し替えだけで真の parity 検証に
 *   切り替えられるようにする。
 *
 * 寿命:
 * - P2-STAGE1-02 で judgment-engine 側に新実装が入った時点で削除し、
 *   parity テストは新実装に対して走らせる。
 *
 * オリジナルとの差分:
 * - `../shared/settings.js` の `getBlockedLevels` と関連型をインライン化（chrome.* 依存を排除）。
 * - それ以外のロジックは完全に同一。
 */

import type { KBGame, GenreTemplate } from '@fresh-chat-keeper/knowledge-base';
import { getAllGenreTemplates } from '@fresh-chat-keeper/knowledge-base';
import aceAttorney1 from '@kb-data/ace-attorney-1.json';
import { matchesSpoilerVerb, normalizeKana } from '@fresh-chat-keeper/shared';

// ─── settings.ts からのインライン化部分 ─────────────────────────────────
export type FilterMode = 'strict' | 'standard' | 'lenient' | 'off';

export interface CustomNGWord {
  id: string;
  word: string;
  enabled: boolean;
}

export interface GameProgress {
  progressModel: 'chapter' | 'event';
  currentChapterId?: string;
  completedEventIds?: string[];
}

function getBlockedLevels(mode: FilterMode): string[] {
  switch (mode) {
    case 'strict':
      return ['direct_spoiler', 'foreshadowing_hint', 'gameplay_hint'];
    case 'standard':
      return ['direct_spoiler', 'foreshadowing_hint'];
    case 'lenient':
      return ['direct_spoiler'];
    case 'off':
      return [];
  }
}

// ─── filter.ts の本体（完全コピー） ──────────────────────────────────────
const ALL_GAMES: KBGame[] = [aceAttorney1 as unknown as KBGame];

export function buildKeywordSet(
  gameId: string,
  filterMode: FilterMode,
  progress?: GameProgress,
): Set<string> {
  const game = ALL_GAMES.find((g) => g.id === gameId);
  if (!game) return new Set();

  const blockedLevels = getBlockedLevels(filterMode);
  const keywords = new Set<string>();
  const chapters = game.chapters ?? [];

  const currentChapterIdx = progress?.currentChapterId
    ? chapters.findIndex((c) => c.id === progress.currentChapterId)
    : -1;

  const shouldBlock = (entity: {
    keywords: string[];
    spoiler_level?: string;
    unlocked_after_chapter?: string;
  }): boolean => {
    if (entity.spoiler_level && !blockedLevels.includes(entity.spoiler_level)) return false;

    if (
      progress?.progressModel === 'chapter' &&
      entity.unlocked_after_chapter &&
      currentChapterIdx !== -1
    ) {
      const unlockedIdx = chapters.findIndex((c) => c.id === entity.unlocked_after_chapter);
      if (unlockedIdx !== -1 && currentChapterIdx > unlockedIdx) return false;
    }

    return true;
  };

  for (const entity of [...game.spoiler_entities, ...(game.global_spoilers ?? [])]) {
    if (shouldBlock(entity)) {
      for (const kw of entity.keywords) keywords.add(kw);
    }
  }

  return keywords;
}

export function buildDescriptionPhraseSet(gameId: string): Set<string> {
  const game = ALL_GAMES.find((g) => g.id === gameId);
  if (!game) return new Set();

  const phrases = new Set<string>();
  const QUOTED_RE = /「([^」]+)」/g;
  const HAS_ALPHANUMERIC_RE = /[\d\w]/;

  const extractFromText = (text: string | undefined) => {
    if (!text) return;
    for (const match of text.matchAll(QUOTED_RE)) {
      const phrase = match[1];
      if (HAS_ALPHANUMERIC_RE.test(phrase)) {
        phrases.add(phrase);
      }
    }
  };

  for (const chapter of game.chapters ?? []) {
    extractFromText(chapter.description);
  }
  for (const entity of [...game.spoiler_entities, ...(game.global_spoilers ?? [])]) {
    extractFromText(entity.description);
  }

  return phrases;
}

export type MatchReason = 'spoiler_word' | 'description_phrase' | 'keyword_with_verb';

export interface MatchResult {
  reason: MatchReason;
  keyword?: string;
  verb?: string;
  phrase?: string;
}

export function matchesKeyword(
  text: string,
  keywords: Set<string>,
  descriptionPhrases: Set<string>,
): MatchResult | null {
  const normalized = normalizeKana(text);

  if (normalized.includes('ネタバレ')) {
    return { reason: 'spoiler_word' };
  }

  for (const phrase of descriptionPhrases) {
    if (normalized.includes(normalizeKana(phrase))) {
      return { reason: 'description_phrase', phrase };
    }
  }

  const verb = matchesSpoilerVerb(text);
  if (verb !== null) {
    for (const kw of keywords) {
      if (normalized.includes(normalizeKana(kw))) {
        return { reason: 'keyword_with_verb', keyword: kw, verb };
      }
    }
  }

  return null;
}

export function matchesCustomNGWord(text: string, words: CustomNGWord[]): string | null {
  if (words.length === 0) return null;
  const normalized = normalizeKana(text);
  for (const entry of words) {
    if (!entry.enabled) continue;
    if (normalized.includes(normalizeKana(entry.word))) return entry.word;
  }
  return null;
}

export function buildActiveGenreTemplates(selectedIds: string[]): GenreTemplate[] {
  if (selectedIds.length === 0) return [];
  const all = getAllGenreTemplates();
  return all.filter((t) => selectedIds.includes(t.id));
}

export function matchesGenreTemplate(text: string, templates: GenreTemplate[]): string | null {
  if (templates.length === 0) return null;
  const normalized = normalizeKana(text);

  for (const template of templates) {
    for (const phrase of template.context_phrases) {
      if (normalized.includes(normalizeKana(phrase))) {
        return phrase;
      }
    }
    const verb = matchesSpoilerVerb(text);
    if (verb !== null) {
      for (const kw of template.keywords) {
        if (normalized.includes(normalizeKana(kw))) {
          return kw;
        }
      }
    }
  }
  return null;
}

export function matchesGameplayHintForStage2(
  text: string,
  templates: GenreTemplate[],
): string | null {
  if (templates.length === 0) return null;
  const normalized = normalizeKana(text);
  for (const template of templates) {
    if (!template.stage2_phrases?.length) continue;
    for (const phrase of template.stage2_phrases) {
      if (normalized.includes(normalizeKana(phrase))) {
        return phrase;
      }
    }
  }
  return null;
}

export function matchesGenreKeywordForStage2(
  text: string,
  templates: GenreTemplate[],
): string | null {
  if (templates.length === 0) return null;
  const normalized = normalizeKana(text);
  for (const template of templates) {
    for (const kw of template.keywords) {
      if (normalized.includes(normalizeKana(kw))) {
        return kw;
      }
    }
  }
  return null;
}

export function matchesKeywordForStage2(text: string, keywords: Set<string>): string | null {
  const normalized = normalizeKana(text);
  for (const kw of keywords) {
    if (normalized.includes(normalizeKana(kw))) {
      return kw;
    }
  }
  return null;
}
