# @fresh-chat-keeper/judgment-engine

Fresh Chat Keeper の **2 段階フィルタ判定エンジン**。Chrome 拡張、Cloudflare Workers、Node.js のいずれからも共通利用できる、DOM / `chrome.*` 非依存の純粋ロジック。

## パッケージの目的

YouTube チャットのネタバレ判定を「キーワードマッチ（Stage 1、ブラウザ内完結、< 10 ms）」と「LLM 判定（Stage 2、プロキシ経由、< 200 ms）」の 2 段階に分け、両ステージの実装をパッケージとして外部化する。

- **環境非依存**: `chrome.storage` や `fetch` 等の環境固有 API は注入で受け取る（`Stage2Transport`、`CacheStorage`）
- **テスト可能**: 通信・ストレージは抽象化されているため、モックを差し込んで高速にテスト可能
- **再利用可能**: 同じロジックを Chrome 拡張・サーバーサイド・将来の OBS ソースで使い回せる

## インストール

モノレポ内で workspace 参照する：

```jsonc
// apps/your-app/package.json
{
  "dependencies": {
    "@fresh-chat-keeper/judgment-engine": "workspace:*"
  }
}
```

## アーキテクチャ概要

```
src/
├── index.ts              # 公開API（types + stage1 + stage2 を再エクスポート）
├── types.ts              # 型定義（Message, Judgment, JudgmentContext, ...）
│
├── stage1/               # Stage 1: キーワード/フレーズマッチ（同期、ブラウザ内完結）
│   ├── index.ts            #   runStage1, isObviouslySafe + 下層マッチの再エクスポート
│   ├── keyword-matcher.ts  #   buildKeywordSet, matchesKeyword 等（KB ベース）
│   ├── custom-blocklist.ts #   matchesCustomNGWord, matchCustomBlocklist
│   └── genre-template.ts   #   matchesGenreTemplate 等（ジャンルテンプレート）
│
├── stage2/               # Stage 2: LLM 判定（非同期、Transport 経由）
│   ├── model-router.ts     #   ModelTier 別の ModelConfig 解決
│   ├── prompt-builder.ts   #   buildSystemPrompt（cache_control 付き）/ buildUserPrompt
│   ├── batcher.ts          #   Stage2Batcher（200 ms ウィンドウ集約）
│   ├── cache.ts            #   JudgmentCache + CacheStorage 抽象
│   └── api-client.ts       #   Stage2Transport の型再エクスポート + テスト用モック
│
└── utils/                # 共通ユーティリティ
    ├── normalize.ts          # テキスト正規化（カナ/全角半角を含む）
    ├── hash.ts               # FNV-1a 32bit
    └── progress-signature.ts # 進行状況の正規化シグネチャ
```

## 主要 API の使用例

### 1. `runStage1` — Stage 1 同期判定

```typescript
import { runStage1 } from '@fresh-chat-keeper/judgment-engine';
import type { Message, JudgmentContext } from '@fresh-chat-keeper/judgment-engine';

const message: Message = {
  id: 'm1',
  text: 'ラスボスは○○',
  authorChannelId: 'UC_xxx',
  authorDisplayName: 'tester',
  timestamp: Date.now(),
};

const context: JudgmentContext = {
  settings: {
    version: 2,
    enabled: true,
    displayMode: 'placeholder',
    filterMode: 'archive',
    categories: { spoiler: { enabled: true, strength: 'standard' } },
    customBlockWords: [],
    userTier: 'free',
  },
  game: {
    gameId: 'ace-attorney-1',
    progressType: 'chapter',
    currentChapter: 'ch1',
  },
};

const result = runStage1(message, context);
// → { outcome: 'filter' | 'pass' | 'gray', reason: ..., label?: 'spoiler' }
```

### 2. `Stage2Batcher` — Stage 2 バッチ判定

```typescript
import { Stage2Batcher, JudgmentCache, createMemoryStorage } from '@fresh-chat-keeper/judgment-engine';
import { createChromeTransport } from './chrome-transport';

const cache = new JudgmentCache({ storage: createMemoryStorage(), ttlMs: 60_000 });
const batcher = new Stage2Batcher({
  transport: createChromeTransport(proxyUrl, anonToken),
  cache,
  modelTier: 'free',
  windowMs: 200,  // デフォルト
  maxBatch: 20,   // デフォルト
});

const judgment = await batcher.enqueue(message, context);
// 200 ms ウィンドウ内の同一コンテキストメッセージは1回の Transport 呼び出しに集約される
```

### 3. `JudgmentCache` — キャッシュ層

```typescript
import { JudgmentCache, createMemoryStorage, type CacheStorage } from '@fresh-chat-keeper/judgment-engine';

// Chrome 拡張側で chrome.storage.local をラップする例
const chromeStorage: CacheStorage = {
  async get(key) {
    const r = await chrome.storage.local.get(key);
    return r[key] ?? null;
  },
  async set(key, value) {
    await chrome.storage.local.set({ [key]: value });
  },
  async delete(key) {
    await chrome.storage.local.remove(key);
  },
};

const cache = new JudgmentCache({ storage: chromeStorage, ttlMs: 7 * 24 * 60 * 60 * 1000 });

const cached = await cache.get(message.text, context);
if (cached) {
  // cached.fromCache === true
}
```

### 4. `Stage2Transport` インターフェース

```typescript
import type { Stage2Transport, JudgeRequestPayload, JudgeResponsePayload } from '@fresh-chat-keeper/judgment-engine';

// 例: Chrome 拡張側（content script から直接 fetch）
function createChromeTransport(proxyUrl: string, token: string): Stage2Transport {
  return {
    async sendJudgeRequest(payload: JudgeRequestPayload): Promise<JudgeResponsePayload> {
      const res = await fetch(`${proxyUrl}/api/judge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-fck-token': token },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    },
  };
}
```

参考実装: [`apps/chrome-ext/src/content/chrome-transport.ts`](../../apps/chrome-ext/src/content/chrome-transport.ts) と [`apps/proxy/src/index.ts`](../../apps/proxy/src/index.ts)。

### 5. `createMockTransport` — テスト用

```typescript
import { createMockTransport, Stage2Batcher } from '@fresh-chat-keeper/judgment-engine';

const transport = createMockTransport((payload) => ({
  results: payload.messages.map((m) => ({
    messageId: m.id,
    verdict: 'allow',
    stage: 2,
  })),
}));

const batcher = new Stage2Batcher({ transport, modelTier: 'free' });
// 通信なしで判定ロジックをテスト可能
```

`createFailingTransport(error?)` も用意（オフライン / プロキシ無応答のテスト用）。

### 6. `buildSystemPrompt` / `buildUserPrompt` — プロンプト組み立て

```typescript
import {
  buildSystemPrompt,
  buildUserPrompt,
  getEffectiveModel,
} from '@fresh-chat-keeper/judgment-engine';

const modelCfg = getEffectiveModel('free');
const systemBlocks = buildSystemPrompt(context, { supportsCaching: modelCfg.supportsCaching });
// systemBlocks: SystemPromptBlock[]
//   Block 1: 固定指示（ラベル定義 + 出力形式）→ cache_control: 'ephemeral'
//   Block 2: ゲームコンテキスト（gameId / 進行状況 / ジャンル / 動画タイトル）→ cache_control: 'ephemeral'

const userPrompt = buildUserPrompt(messages);
// 動的部分（メッセージ列）のみ

// Anthropic API 呼び出し例
await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
  body: JSON.stringify({
    model: modelCfg.model,
    max_tokens: modelCfg.maxTokens,
    temperature: modelCfg.temperature,
    system: systemBlocks,
    messages: [{ role: 'user', content: userPrompt }],
  }),
});
```

### 7. `selectModel` / `getEffectiveModel` — モデルルーター

```typescript
import { selectModel, getEffectiveModel, type ModelTier } from '@fresh-chat-keeper/judgment-engine';

selectModel('free');     // → { model: 'claude-haiku-4-5-20251001', maxTokens: 200, ... }
selectModel('premium');  // → { model: 'claude-sonnet-4-6', maxTokens: 300, ... }（論理的な配置図）

getEffectiveModel('premium');
// Phase 2: どのティアでも Haiku を返す（コスト抑制のため）
// Phase 3 以降: ティアに応じた切り替え
```

## Phase 2 時点の制約

- **`JudgmentLabel` は `'safe' | 'spoiler'` の 2 値のみ**
  Phase 3 で `'harassment' | 'spam' | 'off_topic' | 'backseat'` を追加し、マルチラベル化する予定（[dev-docs/phase-3-multilabel.md](../../dev-docs/phase-3-multilabel.md) 参照）

- **統合エントリ `judgeMessage` / `judgeMessageBatch` は未実装**
  現状は Stage 1 と Stage 2 を呼び出し側でオーケストレートする形（`apps/chrome-ext/src/content/archive.ts` と `apps/chrome-ext/src/content/filter-orchestrator.ts` を参照）。Phase 3 以降で統合予定

- **`runStage1` のジャンルテンプレート統合は限定的**
  `runStage1` 自体は `customBlockWords → KB キーワード → obviously_safe → gray` の 4 経路。`matchesGenreTemplate` 等は下層 API として公開しているが、統合判定には含めていない（chrome-ext 側がジャンルテンプレート分岐を持つ）

## `isObviouslySafe` について（段階A の前駆体）

`runStage1` が `pass` を返す唯一の経路。`草` / `www` / `888` / 2 文字以下の入力を Stage 2 LLM 判定前にショートカットする。

これは Phase 3 で本格化する **段階A（無関係コメント分離、論文 Tran et al. 2023）** の最も素朴な部分実装。Phase 2.5 ingestion ではこの経路のみ `stageACategory: 'reaction'` を記録する（[dev-docs/phase-2-5-data-collection.md](../../dev-docs/phase-2-5-data-collection.md) §2.1, §9.1 参照）。

仕様（[`src/stage1/index.ts`](src/stage1/index.ts) の JSDoc も参照）:

| ルール | 例 |
|---|---|
| `^[w草ｗ]{1,10}$` | `草`, `www`, `ｗｗｗｗ` |
| `^[8８]{3,}$` | `888`, `8888`, `８８８` |
| `length <= 2`（trim 後） | `🎉`, `wa`, `あ`, `88` |

旧 `filter.ts` には対応する処理がなく、`isObviouslySafe` 経路のメッセージは Stage 2 LLM 判定に送られていた（コスト発生）。新エンジンでは Stage 2 をスキップしてコスト削減する意図的な最適化。

## 開発

```bash
pnpm install                                              # ワークスペース依存解決
pnpm --filter @fresh-chat-keeper/judgment-engine build    # tsc -p tsconfig.build.json
pnpm --filter @fresh-chat-keeper/judgment-engine test     # vitest run
pnpm --filter @fresh-chat-keeper/judgment-engine typecheck # tsc --noEmit
```

## 参考ドキュメント

- [dev-docs/phase-2-engine-split.md](../../dev-docs/phase-2-engine-split.md) — 設計書（パッケージ構成、移植方針、テスト戦略）
- [dev-docs/architecture.md](../../dev-docs/architecture.md) §4.1 — 統合アーキテクチャでの位置付け
- [dev-docs/phase-2-5-data-collection.md](../../dev-docs/phase-2-5-data-collection.md) — 段階A（`isObviouslySafe`）の Phase 3 拡張計画
