/**
 * Stage 1 リグレッションテスト用の型定義。
 * filter.ts の MatchResult をフィクスチャ側に複製し、apps/* への依存を排除する。
 */

export type MatchReason = 'spoiler_word' | 'description_phrase' | 'keyword_with_verb';

export interface MatchResult {
  reason: MatchReason;
  keyword?: string;
  verb?: string;
  phrase?: string;
}
