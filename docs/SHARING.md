# 共有機能（OGP画像とXへの共有導線）

## 何ができるか

ゲーム内の各画面から「共有」を開くと、1200×630の記念カードをプレビューし、次の方法で広められる。

- **Xに投稿する** — `https://x.com/intent/post` を新しいタブで開き、文面と共有リンクを渡す。投稿はXの画面で確認してから送信する。自動投稿はしない。リンク先のOGPがカード画像を表示する。
- **画像を保存** — カードPNGをダウンロード。画像を直接添付したい人向け。
- **リンクをコピー** — 共有リンクをクリップボードへ（失敗時は入力欄を選択してコピー）。
- **ほかのアプリで共有** — `navigator.share`。ファイル共有に対応した端末ではPNGも添付する。対応外の端末ではボタン自体を出さない。
- **閉じる** — 共有ダイアログは元の画面・モーダルの上に重なるだけなので、閉じると元の画面へそのまま戻る。
- カード画像の取得に失敗しても、X投稿・リンクコピー・OS共有（リンクのみ）は使える。

### 共有入口

| 画面 | ボタン | 共有種別 |
| --- | --- | --- |
| タイトル | 友だちに教える | `title` |
| 設定 | ゲームを共有 | `title` |
| セーブ一覧（記録のあるスロット） | 共有する | `slot` |
| 通常ステージクリア | 共有する | `stage` |
| 章クリア（組み立て演出） | 共有する | `chapter`／第5章は `flight` |
| 初飛行のエンディング | 完成を共有 | `flight` |
| 工房 | 飛行機を共有 | `workshop` |
| 第6章 出発画面 | 出発を共有 | `sky` |
| 第6章 帰還結果 | 結果を共有 | `voyage` |
| 秘宝コレクション（1つ以上発見） | 秘宝を共有 | `treasure` |
| ランキングの自分の行 | この順位を共有 | `rank` |

## URLとデータ

- `GET /api/share?s=<base64url>` — 紹介ページのHTML。OGP・Twitter Card（`summary_large_image`）のメタデータ、カード、ゲーム紹介、「自分の飛行機をつくる」「無料で遊ぶ」の導線。
- `GET /api/share?s=<base64url>&image=1` — 動的PNG（1200×630）。
- `GET /api/share` — `s` なしはゲーム紹介（`title`）を表示。読み取れない `s` は **400**。
- `POST /api/share?action=event` — 計測イベント（後述）。

`s` はスナップショットJSONのbase64url。**暗号化ではなく、内容はすべて公開情報**として扱う。含めるのは次のみ。

- 共有種別、飛行機名（20文字以内）、色・翼・プロペラ・装飾、組み立て段階、クリア数
- 章・ステージ、飛距離・最長・累計、共有時点の順位、発見済み秘宝

UID・認証キー・セーブ全体は含めない。カードは自己申告の記念画像で、ランキングの更新には使われない。共有後に名前・デザイン・順位が変わっても、カードの内容は固定される。すべての値は `src/share-model.js` の `normalizeSnapshot` で範囲検証され、改変されたURLは拒否される。DB追加・スキーマ変更・新しい環境変数は不要。

紹介ページからの開始先は通常のタイトル（`/?via=share&kind=<種別>`）で、セーブは上書きしない。

## 実装

- `src/share-model.js` — スナップショットの生成・検証・エンコード、文面（クライアントとサーバーで共用）。
- `src/sharing.js` — 共有ダイアログ。
- `src/share-landing.js` / `src/share-landing.css` — 紹介ページの静的ファイル（`dist` から配信）。
- `src/assets/share-default.png` — ルートURL用のOGP画像。`npm run share-default` で再生成。
- `api/share.js` — Vercel Function。HTML／PNG／イベント。
- `server/share-card.js` — `@vercel/og`（satori）+ `sharp` で描画。タイトルカードはロゴを左の文字欄に置き、右側のルカ・トトじい・モスを隠さない。ほかのカードは `dialogue-worlds.webp` のキャラクターのいない章別背景（工房・森・港・洞窟・鍛冶場）または `sky-world.webp` を使い、機体パネルが登場人物に重ならないようにする。`dist/assets` の既存WebPからスプライトを切り出し、機体の色はCSSと同じ `hue-rotate` 行列（`hueMatrix`）で回転、プロペラ・エンブレムは乗算合成。
- `server/assets/NotoSansJP-Bold.woff` — Noto Sans JP weight 700 の日本語サブセット（SIL OFL 1.1、`server/assets/OFL.txt`）。外部フォント取得を行わないため、タイムアウトの心配がない。`✦` はこのフォントに含まれないのでカードでは使わない。

依存: `@vercel/og` 0.8.5（1.x はNode環境で `Dynamic require of fs is not supported` になるため固定）、`sharp` 0.35.4。

## 計測

`POST /api/share?action=event` を Vercel の runtime logs に `{"type":"share-event","event":...,"kind":...,"entry":...}` として記録する。

- `open` ダイアログを開いた／`x` X投稿画面を開いた（投稿完了数ではない）／`copy`／`save`／`native`
- `visit` 紹介ページの表示／`start` 共有リンク経由の訪問者が新しいセーブを作った
- キャンペーンリンク `https://miracle-mine.vercel.app/?via=<slug>`（`x`、`note`、`itch` など英小文字とハイフン 24 文字まで）で開くと、`visit`（kind `title`、entry がスラッグ）を記録し、その訪問者が新しいセーブを作ると `start` を記録する。X のプロフィールや固定ポストには `?via=x` を使う。パラメータはアドレスバーから消され、セーブには残らない。

共有種別と入口名のみ。名前・UID・認証キーは記録しない。永続的な分析DBや管理画面はなく、保持期間はVercelのログに依存する。

## デプロイ

`vercel.json` の `functions["api/share.js"]` に `includeFiles: "{dist/assets/*.webp,server/assets/*}"` と `maxDuration: 60` を設定。Functionに画像とフォントが同梱されることを、本番の `/api/share?s=...&image=1` が1200×630のPNGを返すことで確認する。`src` だけを静的コピーするデプロイではAPIが配置されない。

## 検証

- `npm test` — 往復エンコード、改変URLの拒否、HTML／PNG／イベントの応答、CSSと一致する色行列、PNGサイズ。
- `npm run build && npm run preview` — `/api/share` をローカルで実行（ランキングAPIは503）。
- Xへの実投稿は行わず、共有画面・URL・OGPまでを確認する。本番ランキングにテスト記録を登録しない。
