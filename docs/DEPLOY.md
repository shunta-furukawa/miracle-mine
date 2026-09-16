# 本番デプロイ手順

Vercel の `miracle-mine` プロジェクトは GitHub と連携していない。本番は「GitHub 上の特定コミットを Vercel のビルド中に取得して組み立てる」方式で、送るファイルは 6 つだけ。本番に載るコードは必ず GitHub の main のコミットと一致する。

## 手順

1. 変更を PR で main にマージし、`git rev-parse origin/main` で 40 桁の SHA を控える。
2. 手元で `npm test` と `npm run build` を通す。`dist/sw.js` の `miracle-mine-shell-<hash>` を控える。
3. `node scripts/deploy-payload.mjs <sha> <出力先>.json` でペイロードを作る。SHA が GitHub に存在しないと失敗する。
4. Vercel MCP の `deploy_to_vercel` に `target: "production"`、`name: "miracle-mine"`、`teamId`、`files: <ペイロードの配列>` を渡す。手元なら Vercel CLI で `vercel --prod` でもよい（その場合はリポジトリ全体が送られる）。
5. 本番の `https://miracle-mine.vercel.app/sw.js` を 20 秒間隔で取得し、キャッシュ名が 2 で控えたものに変わるまで待つ（1〜2 分）。ビルドが失敗しても前のデプロイが本番に残る。
6. 検証: 主要ファイルが `dist/` とバイト単位で一致、`/api/ranking?action=status` が `ready: true`、`/api/share?s=…&image=1` が 1200×630 の PNG。ランキングには書き込まない。

## 仕組み

- `scripts/vercel-bootstrap.mjs` が Vercel のビルドコマンドになる。`git fetch --depth 1` でコミットを取得し、`src/` `server/` `scripts/` `api/` を配置して `scripts/build.mjs` を実行する。
- 送る `package.json` は API 関数の依存（Neon、@vercel/og、sharp）だけを含む。`vercel.json` は共有カード用のフォントと画像を関数に同梱させる。
- `scripts/build.mjs` は `app.js` と `about.html` の `__VERSION__` を `package.json` の version に置き換える。バージョンを上げるときは `package.json` と `package-lock.json` の両方を変える。
