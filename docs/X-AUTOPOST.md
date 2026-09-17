# X への自動投稿（週次ランキング）

`.github/workflows/x-weekly.yml` が毎週土曜 20:30（JST）に `scripts/x-post.mjs` を実行し、空の旅ランキングの上位 3 機を @MiracleMine0123 に投稿する。画像は 1 位の機体のランクカードを本番の共有 API で描画したもの。文面にはリンクを入れない（X の従量課金でリンク付き投稿は約 13 倍高いため。プロフィールにリンクがある）。

## 秘密情報

GitHub の Settings → Secrets and variables → Actions → Repository secrets に 4 つ。すべて X 開発者ポータルの OAuth 1.0a のもので、アプリ権限を「読み取りと書き込み」にしてから生成した Access Token を使う。

| Secret | 開発者ポータルでの名前 |
| --- | --- |
| `X_API_KEY` | API Key（Consumer Key） |
| `X_API_SECRET` | API Key Secret（Consumer Secret） |
| `X_ACCESS_TOKEN` | Access Token |
| `X_ACCESS_TOKEN_SECRET` | Access Token Secret |

OAuth 2.0 の Client ID / Client Secret / Refresh Token と Bearer Token は使わない。

## 手動実行

Actions → x-weekly → Run workflow。

- `check`: 認証だけ確認する（`GET /2/users/me`）。投稿しない。
- `test`: 「自動投稿のテストです」という投稿を 1 件出す（ランキングがあれば 1 位のカード付き）。動作確認用で、あとで X 上で削除してよい。
- `dry-run`: 文面と画像を作って成果物（x-weekly-output）に置く。投稿しない。`sample` を有効にすると、ランキングが空でも見本データで生成する。
- `post`: 投稿する。同じ日付の投稿がすでにあれば飛ばす（`force` で無視）。

定期実行は常に `post`。ランキングが空のときは何もしない。

## 費用の目安

投稿 1 件 0.015 ドル（リンクなし）と、投稿前の重複確認の読み取り 1 回。月 4〜5 回で 0.1 ドル未満。

## 変更するとき

- 文面は `weeklyText`、画像は `cardUrlFor`。`npm test` の `x-post` テストで文字数（280 以内）と署名を検証している。
- 曜日や時刻は cron（UTC）を変える。GitHub の cron は数分〜1 時間遅れることがある。
- 投稿を止めるには workflow を無効化するか、Secrets を消す。
