# リリース当日の手順（2026-09-17 に前倒しで実施）

前提: リリース前の X 投稿（紹介 5 本 + 開発者の思い 6 本）は予約済み。投稿サイトの申請は済んでいるか、当日に公開日を合わせる。週次ランキング投稿（土曜 20:30）は 9/19 に 1 回動く。開発者機体だけの盤面が出るのが嫌なら、それまでに Actions で x-weekly を無効化し、22 日に戻す。

## 時間割（JST）

| 時刻 | 誰 | すること |
| --- | --- | --- |
| 前日まで | Claude | 1.0.0 の PR を用意（下記 A）。マージはしない |
| 09:00 | Claude | PR をマージ → 本番デプロイ → 検証。タイトル表示が「Ver. 1.0.0」に変わる |
| 09:30 | Claude | タグ `v1.0.0` を push。GitHub Release は開発者が UI で作成（Releases → Draft a new release → タグ v1.0.0 → 下記 B の本文を貼る） |
| 10:00 | 開発者 | X の固定ポストを下記 C に差し替え。プロフィールの URL が `?via=x` 付きか確認 |
| 10:00 | 開発者 | note にリリース記事（`docs/NOTE-RELEASE.md`）を公開。URL は `?via=note` |
| 12:00 | 開発者 | 投稿サイト（ふりーむ！、夢現、PLiCy、itch.io）の公開。URL は `?via=freem` などで出し分け |
| 18:00 | 開発者 | 開発者向け投稿（下記 D）。技術系は夕方以降 |
| 終日 | 開発者 | `#ミラクルマイン` を検索し、共有カードの投稿を引用リポスト。不具合はリプで一次返信 |
| 翌日 | Claude | Vercel のログで `visit` / `start` を流入元別に集計し、初日の数字を報告 |

## A. 1.0.0 の変更内容

- `package.json` と `package-lock.json` を 1.0.0 に。`versionLabel` により表示が PROTOTYPE から Ver. に切り替わる。
- README の冒頭「Playable prototype」を「Released 1.0.0」に。
- 他のコード変更は入れない。リリース当日は表示とタグだけ。

検証: 本番の `/app.js` に `APP_VERSION='1.0.0'`、タイトルに「Ver. 1.0.0」、`/about` の末尾に「バージョン 1.0.0」。ランキング API と共有カードが正常。

## B. GitHub Release の本文

タイトル: `Miracle Mine 1.0.0`

> 数字をなぞって蒸気飛行機を組み立てる、無料の冒険パズル。
>
> - 5 章 30 ステージ、3 つ星評価、3 つの保存スロット
> - 完成した飛行機で挑む隠し第 6 章「トトじいと空の旅」、シーズン制の飛距離ランキング、6 つの秘宝
> - 共有カード（X 投稿、画像保存、OS 共有）
> - ホーム画面に追加してオフラインで遊べる PWA
> - 無料・広告なし・登録不要。記録は端末内に保存
>
> 遊ぶ: https://miracle-mine.vercel.app ／ 紹介と問い合わせ: https://miracle-mine.vercel.app/about

## C. 固定ポスト（リリース版）

画像: `docs/x-assets/post1-title.jpg`（トレーラーができたら差し替え）

> 数字をなぞって、自分だけの蒸気飛行機を組み立てる無料パズル「Miracle Mine」を公開しました。
> 足し算からはじまり、火山の章で掛け算が解放。5 つの部品を集めて、おじいちゃんと初飛行へ。
> 無料・広告なし・登録不要。スマホ・タブレット・PC のブラウザでそのまま遊べます。
> https://miracle-mine.vercel.app/?via=x
> #ミラクルマイン #MiracleMine

## D. 開発者向け投稿

> 静的サイト + Vercel Functions だけで、共有カードの OGP 動的生成（@vercel/og + sharp）とシーズン制ランキング（Neon Free）を無料枠で運用しています。コードは公開しています。
> https://github.com/shunta-furukawa/miracle-mine
> #個人開発 #Vercel

## 当日に見るもの

- Vercel の runtime logs: `share-error`、ranking の 503、`share-event` の `visit` / `start`。
- Vercel Web Analytics: 訪問数と流入元。
- X の通知: リプライ、DM、`#ミラクルマイン`。

## 翌週

- 9/19（土）20:30 に週次ランキング投稿が自動で出る。プレイヤーの機体が載っているはず。
- 不具合修正は PR → CI → マージ → デプロイの通常手順。バージョンは 1.0.x。
