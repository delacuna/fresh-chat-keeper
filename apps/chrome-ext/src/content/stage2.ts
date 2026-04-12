/**
 * Stage 2 LLM 判定 — proxy クライアント
 *
 * - Stage 1 でフィルタされなかったが、ゲームキーワードを含むコメントを候補として受け取る
 * - apps/proxy の /api/judge エンドポイントに送信し、LLM 判定結果を取得する
 * - 判定結果は chrome.storage にキャッシュし、同じ動画の再視聴時はプロキシへの送信をスキップする
 */

import type { Settings, GameProgress } from '../shared/settings.js';

// ─── 型定義 ────────────────────────────────────────────────────────────────────

export type Stage2Verdict = 'block' | 'allow' | 'uncertain';

export interface JudgeCacheEntry {
  verdict: Stage2Verdict;
  spoilerCategory?: string;
}

/** Stage 2 判定待ちコメントの情報 */
export interface Stage2Candidate {
  /** コメント本文（キャッシュキーにも使用） */
  text: string;
  /** DOM 要素への弱参照（要素が削除された場合は deref() が undefined になる） */
  el: WeakRef<Element>;
  /** chrome.storage キャッシュキー */
  cacheKey: string;
  /** マッチしたゲームキーワード（フィルタ時のメタデータ用） */
  matchedKeyword: string;
}

export type OnStage2Result = (candidate: Stage2Candidate, entry: JudgeCacheEntry) => void;

// ─── キャッシュ ────────────────────────────────────────────────────────────────

export const JUDGE_CACHE_KEY = 'spoilershield_judge_cache';

let _cache: Record<string, JudgeCacheEntry> = {};
let _cacheLoaded = false;

/** 起動時に一度だけ呼び出す。chrome.storage から判定キャッシュをメモリに読み込む。 */
export async function initStage2Cache(): Promise<void> {
  if (_cacheLoaded) return;
  const result = await chrome.storage.local.get(JUDGE_CACHE_KEY);
  _cache = (result[JUDGE_CACHE_KEY] as Record<string, JudgeCacheEntry> | undefined) ?? {};
  _cacheLoaded = true;
}

/** キャッシュから判定結果を同期的に取得する（initStage2Cache 呼び出し後に使用可能）。 */
export function getCachedVerdict(cacheKey: string): JudgeCacheEntry | null {
  return _cache[cacheKey] ?? null;
}

/** 判定結果をメモリキャッシュと chrome.storage の両方に保存する。 */
export async function saveJudgeCacheEntry(cacheKey: string, entry: JudgeCacheEntry): Promise<void> {
  _cache[cacheKey] = entry;
  await chrome.storage.local.set({ [JUDGE_CACHE_KEY]: _cache });
}

/**
 * キャッシュキーを生成する。
 * ゲームID + 進行状況 + テキストの組み合わせで一意にする。
 * 同じ動画を同じ進行状況で再視聴した場合にキャッシュが有効になる。
 */
export function buildStage2CacheKey(
  gameId: string,
  progress: GameProgress | undefined,
  text: string,
): string {
  let progressKey = 'none';
  if (progress?.progressModel === 'chapter') {
    progressKey = progress.currentChapterId ?? 'none';
  } else if (progress?.progressModel === 'event') {
    progressKey = [...(progress.completedEventIds ?? [])].sort().join(',') || 'none';
  }
  return `${gameId}|${progressKey}|${text}`;
}

// ─── プロキシ送信 ─────────────────────────────────────────────────────────────

/**
 * バッチ（最大5件）をプロキシに送信し、結果を onResult コールバックで返す。
 *
 * - ネットワークエラー・プロキシ停止時はコールバックを呼ばずに終了する
 *   （Stage 1 を通過した候補なので、フィルタしない方が安全）
 * - verdict === 'uncertain' は呼び出し元が安全側（フィルタ）に倒す
 */
export async function sendStage2Batch(
  batch: Stage2Candidate[],
  settings: Settings,
  token: string,
  onResult: OnStage2Result,
): Promise<void> {
  const progress = settings.progressByGame[settings.gameId];

  const body = {
    messages: batch.map((c, i) => ({ id: String(i), text: c.text })),
    gameId: settings.gameId,
    progress: buildProxyProgress(settings.gameId, progress),
    filterMode: settings.filterMode,
  };

  try {
    const res = await fetch(`${settings.proxyUrl}/api/judge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-spoilershield-token': token,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      console.error(`[SpoilerShield] Stage 2エラー: HTTP ${res.status}`);
      return;
    }

    const data = await res.json() as {
      results: Array<{ messageId: string; verdict: string; spoilerCategory?: string }>;
    };

    for (const result of data.results) {
      const idx = parseInt(result.messageId, 10);
      const candidate = batch[idx];
      if (!candidate) continue;

      const entry: JudgeCacheEntry = {
        verdict: result.verdict as Stage2Verdict,
        spoilerCategory: result.spoilerCategory,
      };

      console.log(`[SpoilerShield] Stage 2結果: ${candidate.text.slice(0, 20)} → ${result.verdict} ${result.spoilerCategory ?? ''}`);
      await saveJudgeCacheEntry(candidate.cacheKey, entry);
      onResult(candidate, entry);
    }
  } catch (err) {
    console.error(`[SpoilerShield] Stage 2エラー: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ─── ヘルパー ─────────────────────────────────────────────────────────────────

function buildProxyProgress(gameId: string, progress: GameProgress | undefined) {
  return {
    gameId,
    progressModel: progress?.progressModel ?? 'chapter',
    currentChapterId: progress?.currentChapterId,
    completedEventIds: progress?.completedEventIds,
  };
}
