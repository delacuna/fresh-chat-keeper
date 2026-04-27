/**
 * Stage 1 リグレッションテスト用フィクスチャ生成スクリプト。
 *
 * 既存 filter.ts のロジックを実行し、入力と期待出力のペアを
 * `packages/judgment-engine/tests/regression/stage1-fixtures.ts` に書き出す。
 *
 * 実行: cd apps/chrome-ext && pnpm exec tsx scripts/generate-stage1-fixtures.ts
 *
 * 注意:
 * - 出力ファイルは「filter.ts の現状の挙動」を凍結したリグレッションテストの
 *   期待値として使用される。filter.ts に意図的な変更を加えた場合のみ再生成すること。
 * - 判定エンジン（packages/judgment-engine）は apps/chrome-ext を import しないため、
 *   このスクリプトを介して期待値を「値として」フィクスチャに埋め込む。
 *
 * 寿命:
 * - 本スクリプトは filter.ts を直接参照するため、P2-INTEG-01 で filter.ts が
 *   削除されるまでは再実行可能。
 * - P2-INTEG-01 完了後は再実行不可。再生成が必要な場合は git history から
 *   filter.ts を復元するか、新実装（packages/judgment-engine/src/stage1/）を
 *   使った同等のスクリプトを書き直す必要がある。
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  matchesKeyword,
  matchesCustomNGWord,
  matchesGenreTemplate,
  matchesGameplayHintForStage2,
  matchesGenreKeywordForStage2,
  matchesKeywordForStage2,
  buildKeywordSet,
  buildDescriptionPhraseSet,
  type MatchResult,
} from '../src/content/filter.js';
import { getAllGenreTemplates, type GenreTemplate } from '@fresh-chat-keeper/knowledge-base';
import type { CustomNGWord, FilterMode, GameProgress } from '../src/shared/settings.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ALL_GENRES = getAllGenreTemplates();
const RPG = ALL_GENRES.find((t) => t.id === 'rpg')!;
const MYSTERY = ALL_GENRES.find((t) => t.id === 'mystery')!;
const ACTION_HORROR = ALL_GENRES.find((t) => t.id === 'action-horror')!;
const STORY_GENERAL = ALL_GENRES.find((t) => t.id === 'story-general')!;
const GAMEPLAY_HINTS = ALL_GENRES.find((t) => t.id === 'gameplay-hints')!;

const ACE_GAME_ID = 'ace-attorney-1';

// ─── 共通: 第1話完了時点のキーワード/フレーズセット ────────────────────────
// （テストでよく使うベースライン）
const ACE_KEYWORDS_CH1_STANDARD = buildKeywordSet(ACE_GAME_ID, 'standard', {
  progressModel: 'chapter',
  currentChapterId: 'ch1',
});
const ACE_KEYWORDS_CH1_STRICT = buildKeywordSet(ACE_GAME_ID, 'strict', {
  progressModel: 'chapter',
  currentChapterId: 'ch1',
});
const ACE_KEYWORDS_CH1_LENIENT = buildKeywordSet(ACE_GAME_ID, 'lenient', {
  progressModel: 'chapter',
  currentChapterId: 'ch1',
});
const ACE_KEYWORDS_CH3_STANDARD = buildKeywordSet(ACE_GAME_ID, 'standard', {
  progressModel: 'chapter',
  currentChapterId: 'ch3',
});
const ACE_KEYWORDS_CH5_STANDARD = buildKeywordSet(ACE_GAME_ID, 'standard', {
  progressModel: 'chapter',
  currentChapterId: 'ch5',
});
const ACE_DESC_PHRASES = buildDescriptionPhraseSet(ACE_GAME_ID);

// ─── A. matchesKeyword ──────────────────────────────────────────────
interface MatchesKeywordCase {
  name: string;
  text: string;
  keywords: string[];
  descriptionPhrases: string[];
  /** フィクスチャ単位で背景・意図を記録したい場合に使用（生成出力にも保持される） */
  comment?: string;
}

const matchesKeywordCases: MatchesKeywordCase[] = [
  // パターン1: 「ネタバレ」直接
  { name: 'パターン1: ネタバレ単語そのまま', text: 'これネタバレですか？', keywords: [...ACE_KEYWORDS_CH1_STANDARD], descriptionPhrases: [...ACE_DESC_PHRASES] },
  { name: 'パターン1: ひらがな「ねたばれ」（カナ正規化）', text: 'ねたばれ注意', keywords: [...ACE_KEYWORDS_CH1_STANDARD], descriptionPhrases: [...ACE_DESC_PHRASES] },
  { name: 'パターン1: ネタバレ含むコンテキスト長文', text: 'いやー、これ完全にネタバレ食らった気分です', keywords: [...ACE_KEYWORDS_CH1_STANDARD], descriptionPhrases: [...ACE_DESC_PHRASES] },
  // パターン2: description 固有フレーズ
  { name: 'パターン2: DL-6号事件', text: 'DL-6号事件って何', keywords: [...ACE_KEYWORDS_CH1_STANDARD], descriptionPhrases: [...ACE_DESC_PHRASES] },
  { name: 'パターン2: SL-9号事件', text: 'SL-9号事件のラスボスやばい', keywords: [...ACE_KEYWORDS_CH1_STANDARD], descriptionPhrases: [...ACE_DESC_PHRASES] },
  { name: 'パターン2: 該当しない一般文', text: 'これ普通のコメントですよ', keywords: [...ACE_KEYWORDS_CH1_STANDARD], descriptionPhrases: [...ACE_DESC_PHRASES] },
  // パターン3: ゲームKW + 動詞
  { name: 'パターン3: 高日が死んだ（KW+動詞）', text: '高日が死んだのか', keywords: [...ACE_KEYWORDS_CH1_STANDARD], descriptionPhrases: [...ACE_DESC_PHRASES] },
  { name: 'パターン3: KW単独（動詞なし）', text: '高日について', keywords: [...ACE_KEYWORDS_CH1_STANDARD], descriptionPhrases: [...ACE_DESC_PHRASES] },
  { name: 'パターン3: 動詞単独（KWなし）', text: '誰かが死んだ', keywords: [...ACE_KEYWORDS_CH1_STANDARD], descriptionPhrases: [...ACE_DESC_PHRASES] },
  { name: 'パターン3: 山野が犯人（KW+動詞）', text: '山野が犯人だった', keywords: [...ACE_KEYWORDS_CH1_STANDARD], descriptionPhrases: [...ACE_DESC_PHRASES] },
  // 強度 3段階
  { name: '強度 strict: gameplay_hint も含む幅広いセット', text: 'これは何かのキーワードを含む？', keywords: [...ACE_KEYWORDS_CH1_STRICT], descriptionPhrases: [...ACE_DESC_PHRASES] },
  { name: '強度 standard: 標準セット', text: '何でもないコメント', keywords: [...ACE_KEYWORDS_CH1_STANDARD], descriptionPhrases: [...ACE_DESC_PHRASES] },
  { name: '強度 lenient: direct_spoiler のみ', text: 'これは普通の文章', keywords: [...ACE_KEYWORDS_CH1_LENIENT], descriptionPhrases: [...ACE_DESC_PHRASES] },
  { name: '強度 lenient で direct_spoiler は依然block', text: '高日が死んだ', keywords: [...ACE_KEYWORDS_CH1_LENIENT], descriptionPhrases: [...ACE_DESC_PHRASES] },
  // 進行状況による解禁
  { name: '進行 ch1: KW依然block（DL-6 は ch4 解禁前）', text: 'DL-6号事件', keywords: [...ACE_KEYWORDS_CH1_STANDARD], descriptionPhrases: [...ACE_DESC_PHRASES] },
  { name: '進行 ch3: 中盤、KW縮小', text: '何でもないコメント', keywords: [...ACE_KEYWORDS_CH3_STANDARD], descriptionPhrases: [...ACE_DESC_PHRASES] },
  { name: '進行 ch5: 終盤、最大限解禁', text: '何でもないコメント', keywords: [...ACE_KEYWORDS_CH5_STANDARD], descriptionPhrases: [...ACE_DESC_PHRASES] },
  // マッチなし（短い定型）
  { name: 'マッチなし: 草', text: '草', keywords: [...ACE_KEYWORDS_CH1_STANDARD], descriptionPhrases: [...ACE_DESC_PHRASES] },
  { name: 'マッチなし: www', text: 'www', keywords: [...ACE_KEYWORDS_CH1_STANDARD], descriptionPhrases: [...ACE_DESC_PHRASES] },
  // カナ正規化を要求するケース
  { name: 'カナ正規化: 全角英数のフレーズ「ＤＬ－６号事件」', text: 'ＤＬ－６号事件って気になる', keywords: [...ACE_KEYWORDS_CH1_STANDARD], descriptionPhrases: [...ACE_DESC_PHRASES] },
  {
    name: '複合: カナ正規化 + 知識ベース設計（やまのは1話既知のため非ネタバレ）',
    text: 'やまのが犯人だった',
    keywords: [...ACE_KEYWORDS_CH1_STANDARD],
    descriptionPhrases: [...ACE_DESC_PHRASES],
    comment:
      '現状 normalizeKana は漢字→ひらがな変換を行わないため expected: null。' +
      'ただしこのケースは仮にカナ正規化が将来改善されても expected: null が正解。' +
      'なぜなら「やまの」は逆転裁判1の1話冒頭で犯人として公開されるキャラクターであり、' +
      '知識ベース側で unlocked_after_chapter 等によりブロック対象から外れるべきだから。' +
      '本フィクスチャはカナ正規化と知識ベース設計の両方が絡む複合ケースであり、' +
      'Phase 3 以降でカナ正規化を拡張する際の回帰テストとしても意味を持つ。',
  },
];

const matchesKeywordFixtures = matchesKeywordCases.map((c) => ({
  name: c.name,
  ...(c.comment ? { comment: c.comment } : {}),
  input: { text: c.text, keywords: c.keywords, descriptionPhrases: c.descriptionPhrases },
  expected: matchesKeyword(c.text, new Set(c.keywords), new Set(c.descriptionPhrases)),
}));

// ─── B. matchesCustomNGWord ──────────────────────────────────────────
interface MatchesCustomNGWordCase {
  name: string;
  text: string;
  words: CustomNGWord[];
}

const matchesCustomNGWordCases: MatchesCustomNGWordCase[] = [
  { name: 'enabled マッチ', text: 'これは秘密のワードです', words: [{ id: '1', word: '秘密', enabled: true }] },
  { name: 'enabled マッチ（カナ揺れ）', text: 'ねたバレ全開', words: [{ id: '1', word: 'ネタバレ', enabled: true }] },
  { name: 'disabled は無視', text: 'これは秘密のワードです', words: [{ id: '1', word: '秘密', enabled: false }] },
  { name: '全 disabled', text: '何でも', words: [{ id: '1', word: '何でも', enabled: false }, { id: '2', word: 'てきとう', enabled: false }] },
  { name: '空リスト', text: '何でも', words: [] },
  { name: '部分一致 enabled', text: 'スーパースペシャル展開', words: [{ id: '1', word: 'スペシャル', enabled: true }] },
];

const matchesCustomNGWordFixtures = matchesCustomNGWordCases.map((c) => ({
  name: c.name,
  input: { text: c.text, words: c.words },
  expected: matchesCustomNGWord(c.text, c.words),
}));

// ─── C. matchesGenreTemplate ─────────────────────────────────────────
interface MatchesGenreTemplateCase {
  name: string;
  text: string;
  templates: GenreTemplate[];
}

const matchesGenreTemplateCases: MatchesGenreTemplateCase[] = [
  { name: 'RPG context_phrase「ラスボスは」', text: 'ラスボスは○○だよ', templates: [RPG] },
  { name: 'RPG context_phrase「真の黒幕は」', text: 'やっぱり真の黒幕は彼だった', templates: [RPG] },
  { name: 'RPG keyword「ラスボス」+ 動詞「死んだ」', text: 'ラスボスは死んだ', templates: [RPG] },
  { name: 'Mystery context_phrase「犯人は」', text: '犯人は身近な人物', templates: [MYSTERY] },
  { name: 'Mystery keyword単独 → null', text: '犯人いるよね', templates: [MYSTERY] },
  { name: '複数テンプレート（RPG+Mystery）', text: 'ラスボスは犯人だった', templates: [RPG, MYSTERY] },
  { name: '空テンプレート → null', text: 'ラスボスは○○', templates: [] },
  { name: '該当なし: 一般的なテキスト', text: 'こんにちは皆さん', templates: [RPG, MYSTERY] },
  { name: 'action-horror context_phrase', text: '主人公は実は死んでた', templates: [ACTION_HORROR] },
  { name: 'story-general context_phrase', text: '黒幕は副官だった', templates: [STORY_GENERAL] },
];

const matchesGenreTemplateFixtures = matchesGenreTemplateCases.map((c) => ({
  name: c.name,
  input: { text: c.text, templateIds: c.templates.map((t) => t.id) },
  expected: matchesGenreTemplate(c.text, c.templates),
}));

// ─── D. matchesGameplayHintForStage2 ─────────────────────────────────
interface MatchesGameplayHintCase {
  name: string;
  text: string;
  templates: GenreTemplate[];
}

const matchesGameplayHintCases: MatchesGameplayHintCase[] = [
  { name: 'gameplay-hints stage2_phrases にマッチ', text: 'このボス、弱点は炎だよ', templates: [GAMEPLAY_HINTS] },
  { name: 'stage2_phrases なしテンプレート（RPG）', text: '何でも', templates: [RPG] },
  { name: '空テンプレート', text: '何でも', templates: [] },
  { name: '部分マッチ', text: 'なるほど、これ攻略法は左から行くといい', templates: [GAMEPLAY_HINTS] },
  { name: '該当なし', text: 'こんにちは', templates: [GAMEPLAY_HINTS] },
];

const matchesGameplayHintFixtures = matchesGameplayHintCases.map((c) => ({
  name: c.name,
  input: { text: c.text, templateIds: c.templates.map((t) => t.id) },
  expected: matchesGameplayHintForStage2(c.text, c.templates),
}));

// ─── E. matchesGenreKeywordForStage2 ─────────────────────────────────
const matchesGenreKeywordCases: MatchesGameplayHintCase[] = [
  { name: 'RPG keyword単独マッチ', text: 'ラスボスについて話そう', templates: [RPG] },
  { name: 'Mystery keyword単独マッチ', text: '犯人気になる', templates: [MYSTERY] },
  { name: '該当なし', text: 'こんにちは', templates: [RPG] },
  { name: '空テンプレート', text: 'ラスボス', templates: [] },
  { name: '複数テンプレート', text: '裏ボス強い', templates: [RPG, MYSTERY] },
];

const matchesGenreKeywordFixtures = matchesGenreKeywordCases.map((c) => ({
  name: c.name,
  input: { text: c.text, templateIds: c.templates.map((t) => t.id) },
  expected: matchesGenreKeywordForStage2(c.text, c.templates),
}));

// ─── F. matchesKeywordForStage2 ──────────────────────────────────────
interface MatchesKeywordForStage2Case {
  name: string;
  text: string;
  keywords: string[];
}

const matchesKeywordForStage2Cases: MatchesKeywordForStage2Case[] = [
  { name: 'KW単独マッチ', text: '高日についてどう思う', keywords: [...ACE_KEYWORDS_CH1_STANDARD] },
  { name: '部分一致', text: '山野星雄は', keywords: [...ACE_KEYWORDS_CH1_STANDARD] },
  { name: '空セット → null', text: '高日', keywords: [] },
  { name: '該当しないテキスト', text: 'こんにちは皆さん', keywords: [...ACE_KEYWORDS_CH1_STANDARD] },
  { name: 'カナ正規化: ひらがな揺れ', text: 'やまのって誰', keywords: [...ACE_KEYWORDS_CH1_STANDARD] },
];

const matchesKeywordForStage2Fixtures = matchesKeywordForStage2Cases.map((c) => ({
  name: c.name,
  input: { text: c.text, keywords: c.keywords },
  expected: matchesKeywordForStage2(c.text, new Set(c.keywords)),
}));

// ─── G. buildKeywordSet ──────────────────────────────────────────────
interface BuildKeywordSetCase {
  name: string;
  gameId: string;
  filterMode: FilterMode;
  progress?: GameProgress;
}

const buildKeywordSetCases: BuildKeywordSetCase[] = [
  { name: 'ace-attorney-1, standard, ch1', gameId: ACE_GAME_ID, filterMode: 'standard', progress: { progressModel: 'chapter', currentChapterId: 'ch1' } },
  { name: 'ace-attorney-1, standard, ch3', gameId: ACE_GAME_ID, filterMode: 'standard', progress: { progressModel: 'chapter', currentChapterId: 'ch3' } },
  { name: 'ace-attorney-1, standard, ch5', gameId: ACE_GAME_ID, filterMode: 'standard', progress: { progressModel: 'chapter', currentChapterId: 'ch5' } },
  { name: 'ace-attorney-1, strict, ch1', gameId: ACE_GAME_ID, filterMode: 'strict', progress: { progressModel: 'chapter', currentChapterId: 'ch1' } },
  { name: 'ace-attorney-1, lenient, ch1', gameId: ACE_GAME_ID, filterMode: 'lenient', progress: { progressModel: 'chapter', currentChapterId: 'ch1' } },
  { name: '未知のゲームID → 空集合', gameId: 'unknown-game', filterMode: 'standard', progress: undefined },
];

const buildKeywordSetFixtures = buildKeywordSetCases.map((c) => ({
  name: c.name,
  input: { gameId: c.gameId, filterMode: c.filterMode, progress: c.progress },
  expected: [...buildKeywordSet(c.gameId, c.filterMode, c.progress)].sort(),
}));

// ─── H. buildDescriptionPhraseSet ────────────────────────────────────
interface BuildDescriptionCase {
  name: string;
  gameId: string;
}

const buildDescriptionCases: BuildDescriptionCase[] = [
  { name: 'ace-attorney-1: 全フレーズ抽出', gameId: ACE_GAME_ID },
  { name: '未知のゲームID → 空集合', gameId: 'unknown-game' },
  { name: '空文字 ID → 空集合', gameId: '' },
];

const buildDescriptionFixtures = buildDescriptionCases.map((c) => ({
  name: c.name,
  input: { gameId: c.gameId },
  expected: [...buildDescriptionPhraseSet(c.gameId)].sort(),
}));

// ─── 出力 ────────────────────────────────────────────────────────────
const totalCount =
  matchesKeywordFixtures.length +
  matchesCustomNGWordFixtures.length +
  matchesGenreTemplateFixtures.length +
  matchesGameplayHintFixtures.length +
  matchesGenreKeywordFixtures.length +
  matchesKeywordForStage2Fixtures.length +
  buildKeywordSetFixtures.length +
  buildDescriptionFixtures.length;

const header = `/**
 * Stage 1 リグレッションテスト用フィクスチャ。
 *
 * **このファイルは自動生成されている。直接編集しないこと。**
 * 再生成: cd apps/chrome-ext && pnpm exec tsx scripts/generate-stage1-fixtures.ts
 *
 * 期待値は filter.ts (apps/chrome-ext/src/content) を直接実行して取得した値を
 * 静的に埋め込んでいる。判定エンジン側のテストは apps/chrome-ext を参照しない。
 *
 * 合計 ${totalCount} 件（A:${matchesKeywordFixtures.length} B:${matchesCustomNGWordFixtures.length} C:${matchesGenreTemplateFixtures.length} D:${matchesGameplayHintFixtures.length} E:${matchesGenreKeywordFixtures.length} F:${matchesKeywordForStage2Fixtures.length} G:${buildKeywordSetFixtures.length} H:${buildDescriptionFixtures.length}）
 */

import type { MatchResult } from './stage1-types.js';

`;

interface CustomNGWordFixture {
  id: string;
  word: string;
  enabled: boolean;
}

interface GameProgressFixture {
  progressModel: 'chapter' | 'event';
  currentChapterId?: string;
  completedEventIds?: string[];
}

const body =
  `// ─── A. matchesKeyword ──────────────────────────────────────────────\n` +
  `export interface MatchesKeywordFixture {\n` +
  `  name: string;\n` +
  `  /** 該当フィクスチャの背景・意図（複合ケースの解説等） */\n` +
  `  comment?: string;\n` +
  `  input: { text: string; keywords: string[]; descriptionPhrases: string[] };\n` +
  `  expected: MatchResult | null;\n` +
  `}\n\n` +
  `export const MATCHES_KEYWORD_FIXTURES: MatchesKeywordFixture[] = ${JSON.stringify(matchesKeywordFixtures, null, 2)};\n\n` +
  `// ─── B. matchesCustomNGWord ──────────────────────────────────────────\n` +
  `export interface MatchesCustomNGWordFixture {\n` +
  `  name: string;\n` +
  `  input: { text: string; words: { id: string; word: string; enabled: boolean }[] };\n` +
  `  expected: string | null;\n` +
  `}\n\n` +
  `export const MATCHES_CUSTOM_NG_WORD_FIXTURES: MatchesCustomNGWordFixture[] = ${JSON.stringify(matchesCustomNGWordFixtures, null, 2)};\n\n` +
  `// ─── C. matchesGenreTemplate ─────────────────────────────────────────\n` +
  `export interface MatchesGenreTemplateFixture {\n` +
  `  name: string;\n` +
  `  input: { text: string; templateIds: string[] };\n` +
  `  expected: string | null;\n` +
  `}\n\n` +
  `export const MATCHES_GENRE_TEMPLATE_FIXTURES: MatchesGenreTemplateFixture[] = ${JSON.stringify(matchesGenreTemplateFixtures, null, 2)};\n\n` +
  `// ─── D. matchesGameplayHintForStage2 ─────────────────────────────────\n` +
  `export interface MatchesGameplayHintFixture {\n` +
  `  name: string;\n` +
  `  input: { text: string; templateIds: string[] };\n` +
  `  expected: string | null;\n` +
  `}\n\n` +
  `export const MATCHES_GAMEPLAY_HINT_FIXTURES: MatchesGameplayHintFixture[] = ${JSON.stringify(matchesGameplayHintFixtures, null, 2)};\n\n` +
  `// ─── E. matchesGenreKeywordForStage2 ─────────────────────────────────\n` +
  `export interface MatchesGenreKeywordFixture {\n` +
  `  name: string;\n` +
  `  input: { text: string; templateIds: string[] };\n` +
  `  expected: string | null;\n` +
  `}\n\n` +
  `export const MATCHES_GENRE_KEYWORD_FIXTURES: MatchesGenreKeywordFixture[] = ${JSON.stringify(matchesGenreKeywordFixtures, null, 2)};\n\n` +
  `// ─── F. matchesKeywordForStage2 ──────────────────────────────────────\n` +
  `export interface MatchesKeywordForStage2Fixture {\n` +
  `  name: string;\n` +
  `  input: { text: string; keywords: string[] };\n` +
  `  expected: string | null;\n` +
  `}\n\n` +
  `export const MATCHES_KEYWORD_FOR_STAGE2_FIXTURES: MatchesKeywordForStage2Fixture[] = ${JSON.stringify(matchesKeywordForStage2Fixtures, null, 2)};\n\n` +
  `// ─── G. buildKeywordSet ──────────────────────────────────────────────\n` +
  `export interface BuildKeywordSetFixture {\n` +
  `  name: string;\n` +
  `  input: { gameId: string; filterMode: 'strict' | 'standard' | 'lenient' | 'off'; progress?: { progressModel: 'chapter' | 'event'; currentChapterId?: string; completedEventIds?: string[] } };\n` +
  `  /** sorted ascending */\n` +
  `  expected: string[];\n` +
  `}\n\n` +
  `export const BUILD_KEYWORD_SET_FIXTURES: BuildKeywordSetFixture[] = ${JSON.stringify(buildKeywordSetFixtures, null, 2)};\n\n` +
  `// ─── H. buildDescriptionPhraseSet ────────────────────────────────────\n` +
  `export interface BuildDescriptionPhraseSetFixture {\n` +
  `  name: string;\n` +
  `  input: { gameId: string };\n` +
  `  /** sorted ascending */\n` +
  `  expected: string[];\n` +
  `}\n\n` +
  `export const BUILD_DESCRIPTION_PHRASE_SET_FIXTURES: BuildDescriptionPhraseSetFixture[] = ${JSON.stringify(buildDescriptionFixtures, null, 2)};\n`;

const outputPath = resolve(
  __dirname,
  '../../../packages/judgment-engine/tests/regression/stage1-fixtures.ts',
);
writeFileSync(outputPath, header + body, 'utf8');

const typesPath = resolve(
  __dirname,
  '../../../packages/judgment-engine/tests/regression/stage1-types.ts',
);
const typesBody = `/**
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
`;
writeFileSync(typesPath, typesBody, 'utf8');

// 未使用変数の警告抑制
void ({} as MatchResult);

console.log(`Wrote ${totalCount} fixtures to ${outputPath}`);
