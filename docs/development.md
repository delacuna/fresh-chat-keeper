# 開発メモ

## プロキシ URL の切り替え

デフォルトの `proxyUrl` は本番環境（Cloudflare Workers）を向いています。

```
https://fresh-chat-keeper-proxy.playnicelab.workers.dev
```

### ローカル開発時に localhost に切り替える

`wrangler dev` でローカルプロキシ（`http://localhost:8787`）を起動している場合、
Chrome の DevTools コンソール（拡張のバックグラウンドページまたはコンテンツスクリプトのコンテキスト）で以下を実行します。

```javascript
chrome.storage.local.get('fck_settings', (r) => {
  const s = r.fck_settings ?? {};
  chrome.storage.local.set({ fck_settings: { ...s, proxyUrl: 'http://localhost:8787' } });
});
```

### 本番 URL に戻す

`proxyUrl` キーを削除すると `DEFAULT_SETTINGS` のデフォルト値（本番 URL）が使われます。

```javascript
chrome.storage.local.get('fck_settings', (r) => {
  const s = r.fck_settings ?? {};
  delete s.proxyUrl;
  chrome.storage.local.set({ fck_settings: s });
});
```

または明示的に本番 URL を指定しても構いません。

```javascript
chrome.storage.local.get('fck_settings', (r) => {
  const s = r.fck_settings ?? {};
  chrome.storage.local.set({ fck_settings: { ...s, proxyUrl: 'https://fresh-chat-keeper-proxy.playnicelab.workers.dev' } });
});
```

### 仕組み

`loadSettings()` は `{ ...DEFAULT_SETTINGS, ...storedSettings }` の形でマージするため、
`chrome.storage` に `proxyUrl` が保存されていればそちらが優先され、なければデフォルト値が使われます。
