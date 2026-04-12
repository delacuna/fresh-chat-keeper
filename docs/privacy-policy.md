# プライバシーポリシー / Privacy Policy

**SpoilerShield Chrome Extension**
最終更新 / Last updated: 2026-04-12

---

## 日本語

### 収集するデータ

SpoilerShield は個人を特定できる情報を一切収集しません。

### ローカルに保存する情報

以下の情報はお使いのブラウザの `chrome.storage.local` にのみ保存され、外部サーバーには送信されません。

| 項目 | 用途 |
|------|------|
| フィルタ設定（有効/無効、フィルタモード、表示モード等） | 設定の永続化 |
| ゲーム進行状況 | ネタバレ判定の基準として使用 |
| Stage 2 判定キャッシュ（テキストのハッシュ → 判定結果） | 同一コメントへの重複リクエスト防止 |
| 匿名トークン（UUID） | レート制限のためにプロキシへ送信（ユーザーとは紐付かない） |
| 誤判定レポート（最大 100 件） | 将来のモデル改善のため端末内に蓄積（現時点で外部送信はしない） |
| 月間利用カウント | 月間上限の管理 |

### Anthropic API へのデータ送信

ネタバレ判定（Stage 2）を行う際に、YouTube チャットのコメントテキストを Anthropic の Claude API に送信します。

- 送信するのはコメントテキストのみです。ユーザー名・アカウント情報・視聴履歴は送信しません。
- API リクエストは SpoilerShield が管理する軽量プロキシ経由で行われます。
- **プロキシはチャットメッセージをログ保存しません。** 判定処理後に破棄されます。
- Anthropic のデータ取り扱いについては [Anthropic Privacy Policy](https://www.anthropic.com/privacy) を参照してください。

### 第三者へのデータの販売・共有

SpoilerShield はユーザーデータを第三者に販売・共有することは一切ありません。

### 問い合わせ

ご質問は GitHub リポジトリの Issues よりお問い合わせください。

---

## English

### Data Collection

SpoilerShield does not collect any personally identifiable information.

### Information Stored Locally

The following information is stored only in your browser's `chrome.storage.local` and is never transmitted to external servers.

| Item | Purpose |
|------|---------|
| Filter settings (enabled/disabled, filter mode, display mode, etc.) | Persisting user preferences |
| Game progress | Used as reference point for spoiler detection |
| Stage 2 judgment cache (text hash → verdict) | Avoiding duplicate requests for the same comment |
| Anonymous token (UUID) | Sent to the proxy for rate-limiting purposes only; not linked to any user identity |
| False-positive reports (up to 100 entries) | Stored locally for future model improvement; not transmitted externally at this time |
| Monthly usage count | Managing the monthly usage limit |

### Data Sent to Anthropic API

When performing spoiler detection (Stage 2), SpoilerShield sends YouTube chat comment text to the Anthropic Claude API.

- Only the comment text is sent. Usernames, account information, and viewing history are never sent.
- API requests are made through a lightweight proxy managed by SpoilerShield.
- **The proxy does not log chat messages.** They are discarded after processing.
- For Anthropic's data handling practices, please refer to the [Anthropic Privacy Policy](https://www.anthropic.com/privacy).

### Data Sharing

SpoilerShield does not sell or share user data with any third parties.

### Contact

For questions, please open an issue on the GitHub repository.
