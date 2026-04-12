/**
 * YouTube チャットリプレイの DOM 操作ユーティリティ
 *
 * 重要: display:none は Flow Chat 等の他拡張に効かないため、デフォルトはテキスト書き換え方式。
 * displayMode='hidden' の場合のみ行要素に display:none を設定する（Flow Chat との非互換あり）。
 */

import type { DisplayMode } from '../shared/settings.js';

const ATTR_ORIGINAL = 'data-spoilershield-original';
const ATTR_FILTERED = 'data-spoilershield-filtered';
const ATTR_HIDDEN_ROW = 'data-spoilershield-hidden-row';
/** 誤判定報告済みを示す属性。processMessage がこの要素を再フィルタしないために使用する。 */
export const ATTR_FALSE_POSITIVE = 'data-spoilershield-false-positive';

const PLACEHOLDER = '⚠ ネタバレの可能性があるためフィルタされました（クリックで表示）';

const MISREPORT_BTN_STYLE = [
  'margin-left:6px',
  'font-size:0.75em',
  'cursor:pointer',
  'opacity:0.65',
  'background:none',
  'border:1px solid currentColor',
  'border-radius:3px',
  'color:inherit',
  'padding:0 4px',
  'vertical-align:middle',
  'white-space:nowrap',
  'line-height:1.4',
].join(';');

/**
 * 要素ごとに登録済みのトグルリスナーを管理する。
 * setupPlaceholderToggle が再呼び出しされた場合に古いリスナーを解除する。
 */
const toggleListeners = new WeakMap<Element, AbortController>();

// ─── 公開 API ────────────────────────────────────────────────────────────────

/**
 * メッセージ要素をフィルタする。
 * - placeholder: テキストをプレースホルダーに書き換え、クリックでトグル可能（表示/非表示）
 * - hidden: 行要素に display:none を設定（Flow Chat 等では効かない場合あり）
 *
 * @param onReveal    誤判定ボタンクリック時のコールバック（revealedTexts に追加する用途）
 * @param onMisreport 誤判定ボタンクリック時のコールバック（placeholder モードのみ有効）
 */
export function filterMessageElement(
  el: Element,
  displayMode: DisplayMode,
  matchedKeyword?: string,
  matchedContext?: string,
  onReveal?: () => void,
  onMisreport?: () => void,
): void {
  if (el.getAttribute(ATTR_FILTERED) === 'true') return;

  const originalText = el.textContent ?? '';
  if (!originalText.trim()) return;

  el.setAttribute(ATTR_FILTERED, 'true');
  if (matchedKeyword) {
    el.setAttribute('data-spoilershield-matched-keyword', matchedKeyword);
  }
  if (matchedContext) {
    el.setAttribute('data-spoilershield-matched-context', matchedContext);
  }

  if (displayMode === 'hidden') {
    // 行コンテナを非表示にする（誤判定ボタンは表示しない）
    const row =
      el.closest('yt-live-chat-text-message-renderer') ??
      el.closest('yt-live-chat-paid-message-renderer') ??
      el.parentElement;
    if (row) {
      row.setAttribute(ATTR_HIDDEN_ROW, 'true');
      (row as HTMLElement).style.display = 'none';
    }
  } else {
    setupPlaceholderToggle(el, originalText, onReveal, onMisreport);
  }
}

/**
 * フィルタ済み要素の表示方式を、復元→再フィルタなしで直接切り替える。
 * フラッシュを防ぐため、ユーザーに元テキストが見える瞬間を作らない。
 */
export function switchDisplayMode(el: Element, nextMode: DisplayMode, onReveal?: () => void): void {
  if (el.getAttribute(ATTR_FILTERED) !== 'true') return;

  if (nextMode === 'hidden') {
    // placeholder → hidden
    // ATTR_ORIGINAL に退避済みのオリジナルテキストを使って行を非表示にする
    abortToggleListener(el);
    const original = el.getAttribute(ATTR_ORIGINAL);
    if (original !== null) {
      el.textContent = original;
      el.removeAttribute(ATTR_ORIGINAL);
      (el as HTMLElement).style.cursor = '';
      (el as HTMLElement).style.opacity = '';
    }
    const row =
      el.closest('yt-live-chat-text-message-renderer') ??
      el.closest('yt-live-chat-paid-message-renderer') ??
      el.parentElement;
    if (row) {
      row.setAttribute(ATTR_HIDDEN_ROW, 'true');
      (row as HTMLElement).style.display = 'none';
    }
  } else {
    // hidden → placeholder
    // hidden モードでは ATTR_ORIGINAL がないため現在の textContent がオリジナル
    const originalText = el.textContent ?? '';

    // 先にテキストをプレースホルダーに書き換えてから行を表示（表示瞬間のチラつき防止）
    setupPlaceholderToggle(el, originalText, onReveal, undefined);

    const hiddenRow = el.closest(`[${ATTR_HIDDEN_ROW}]`);
    if (hiddenRow) {
      hiddenRow.removeAttribute(ATTR_HIDDEN_ROW);
      (hiddenRow as HTMLElement).style.display = '';
    }
  }
}

/**
 * フィルタ済み要素を元に戻す（設定変更時や手動復元に使用）。
 * ATTR_FALSE_POSITIVE は保持する（誤判定報告済み状態は残す）。
 */
export function restoreMessageElement(el: Element): void {
  const filteredAttr = el.getAttribute(ATTR_FILTERED);
  if (filteredAttr !== 'true' && filteredAttr !== 'revealed') return;

  abortToggleListener(el);

  // hidden モード: 行コンテナの表示を戻す
  const hiddenRow = el.closest(`[${ATTR_HIDDEN_ROW}]`);
  if (hiddenRow) {
    hiddenRow.removeAttribute(ATTR_HIDDEN_ROW);
    (hiddenRow as HTMLElement).style.display = '';
  }

  // placeholder モード: テキストを復元（子要素 span/button も除去）
  const original = el.getAttribute(ATTR_ORIGINAL);
  if (original !== null) {
    el.textContent = original;
    el.removeAttribute(ATTR_ORIGINAL);
    (el as HTMLElement).style.cursor = '';
    (el as HTMLElement).style.opacity = '';
  }

  el.removeAttribute(ATTR_FILTERED);
}

// ─── 内部ヘルパー ─────────────────────────────────────────────────────────────

/**
 * プレースホルダー表示とトグル動作をセットアップする。
 *
 * 状態機械:
 *   filtered (ATTR_FILTERED='true')
 *     → クリック → revealed (ATTR_FILTERED='revealed')
 *     → クリック → filtered（繰り返し）
 *
 * 誤判定ボタンは初回 revealed 時に生成される。
 * 誤判定報告後は「✓ 報告済み」になり、ATTR_FALSE_POSITIVE を付与する。
 */
function setupPlaceholderToggle(
  el: Element,
  originalText: string,
  onReveal?: () => void,
  onMisreport?: () => void,
): void {
  // 既存のトグルリスナーを解除してから再設定
  abortToggleListener(el);
  const ctrl = new AbortController();
  toggleListeners.set(el, ctrl);

  el.setAttribute(ATTR_ORIGINAL, originalText);
  el.textContent = '';
  const textSpan = document.createElement('span');
  textSpan.textContent = PLACEHOLDER;
  el.appendChild(textSpan);

  (el as HTMLElement).style.cursor = 'pointer';
  (el as HTMLElement).style.opacity = '0.55';

  // 誤判定ボタンとその状態（クロージャで保持）
  let btn: HTMLButtonElement | null = null;
  let reported = el.getAttribute(ATTR_FALSE_POSITIVE) === 'true';

  el.addEventListener('click', (e: Event) => {
    // 誤判定ボタン自身のクリックはトグルを発動しない
    if ((e.target as Element).closest('[data-spoilershield-misreport]')) return;

    const state = el.getAttribute(ATTR_FILTERED);

    if (state === 'true') {
      // filtered → revealed: 元テキストを表示し、誤判定ボタンを出現させる
      textSpan.textContent = originalText;
      el.setAttribute(ATTR_FILTERED, 'revealed');
      (el as HTMLElement).style.opacity = '';

      if (onMisreport) {
        if (!btn) {
          btn = createMisreportButton(reported, () => {
            reported = true;
            el.setAttribute(ATTR_FALSE_POSITIVE, 'true');
            onMisreport();
            onReveal?.();
          });
          el.appendChild(btn);
        } else {
          btn.style.display = '';
        }
      }
    } else if (state === 'revealed') {
      // revealed → filtered: プレースホルダーに戻し、誤判定ボタンを隠す
      textSpan.textContent = PLACEHOLDER;
      el.setAttribute(ATTR_FILTERED, 'true');
      (el as HTMLElement).style.opacity = '0.55';
      if (btn) btn.style.display = 'none';
    }
  }, { signal: ctrl.signal });
}

/** 誤判定ボタン要素を生成する */
function createMisreportButton(
  alreadyReported: boolean,
  onReport: () => void,
): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.setAttribute('data-spoilershield-misreport', 'true');
  btn.style.cssText = MISREPORT_BTN_STYLE;

  if (alreadyReported) {
    btn.textContent = '✓ 報告済み';
    btn.disabled = true;
    btn.style.cursor = 'default';
    btn.style.opacity = '0.45';
  } else {
    btn.textContent = '❌ 誤判定';
    btn.addEventListener('click', (e: Event) => {
      e.stopPropagation();
      btn.textContent = '✓ 報告済み';
      btn.disabled = true;
      btn.style.cursor = 'default';
      btn.style.opacity = '0.45';
      onReport();
    }, { once: true });
  }

  return btn;
}

/** 登録済みのトグルリスナーを解除する */
function abortToggleListener(el: Element): void {
  toggleListeners.get(el)?.abort();
  toggleListeners.delete(el);
}
