/**
 * 拡張機能の設定型定義と chrome.storage ヘルパー
 * ポップアップ / Content Script の両方から参照する
 */

export type FilterMode = 'strict' | 'standard' | 'lenient';
export type DisplayMode = 'placeholder' | 'hidden';

export interface GameProgress {
  progressModel: 'chapter' | 'event';
  /** チャプターモデル: 現在プレイ中のチャプターID */
  currentChapterId?: string;
  /** イベントモデル: 通過済みイベントIDの配列 */
  completedEventIds?: string[];
}

export interface Settings {
  enabled: boolean;
  /** アクティブなゲームID */
  gameId: string;
  /** ゲームごとの進行状況 */
  progressByGame: Record<string, GameProgress>;
  filterMode: FilterMode;
  displayMode: DisplayMode;
  /** Stage 2 プロキシの URL（デフォルト: http://localhost:8787） */
  proxyUrl: string;
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  gameId: 'ace-attorney-1',
  progressByGame: {},
  filterMode: 'standard',
  displayMode: 'placeholder',
  proxyUrl: 'http://localhost:8787',
};

/** メイン設定のストレージキー。書き込みはポップアップのみ行う。 */
export const STORAGE_KEY = 'spoilershield_settings';

/**
 * 匿名トークンのストレージキー。
 * 初回起動時に UUID を生成して保存し、以降は同じ値を使い回す。
 */
export const ANON_TOKEN_KEY = 'spoilershield_anon_token';

/**
 * フィルタカウントの専用ストレージキー。
 * Content Script のみ書き込む。STORAGE_KEY との競合を防ぐために分離している。
 */
export const FILTER_COUNT_KEY = 'spoilershield_filter_count';

/**
 * フィルタモードに応じてブロック対象の spoiler_level 一覧を返す
 *
 * strict  : direct_spoiler + foreshadowing_hint + gameplay_hint
 * standard: direct_spoiler + foreshadowing_hint
 * lenient : direct_spoiler のみ
 */
export function getBlockedLevels(mode: FilterMode): string[] {
  switch (mode) {
    case 'strict':
      return ['direct_spoiler', 'foreshadowing_hint', 'gameplay_hint'];
    case 'standard':
      return ['direct_spoiler', 'foreshadowing_hint'];
    case 'lenient':
      return ['direct_spoiler'];
  }
}

/** chrome.storage.local から設定を読み込む */
export async function loadSettings(): Promise<Settings> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return { ...DEFAULT_SETTINGS, ...(result[STORAGE_KEY] as Partial<Settings>) };
}

/** chrome.storage.local に設定を保存する */
export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: settings });
}

/**
 * 匿名トークンを取得する。まだ存在しない場合は UUID を生成して保存する。
 * リクエストヘッダー x-spoilershield-token に使用する。
 */
export async function getOrCreateAnonToken(): Promise<string> {
  const result = await chrome.storage.local.get(ANON_TOKEN_KEY);
  const existing = result[ANON_TOKEN_KEY] as string | undefined;
  if (existing) return existing;

  const token = crypto.randomUUID();
  await chrome.storage.local.set({ [ANON_TOKEN_KEY]: token });
  console.log('[SpoilerShield] 匿名トークンを生成しました:', token.slice(0, 8) + '...');
  return token;
}