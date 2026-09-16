# Dedicated puzzle assets (0.12)

Created with the built-in image generation tool using the existing cast and stone design boards as references. No third-party characters or stock artwork added.

- `src/assets/game-cast.webp`: 3 × 2 atlas of square portraits, ordered Luka / Moss / Shell / Crim / Flare / Fuu. Complete heads, friendly poses and consistent transparent padding; displayed inside separate portrait areas so text cannot cover faces.
- `src/assets/game-stones.webp`: 5 × 2 atlas of uniform square tiles, ordered 0–4 / 5–9, retaining each original colour and elemental emblem. Each tile is normalized to 256 × 256 without design-sheet captions or surrounding paper. Game buttons use regular atlas coordinates.

Prompt set: create a dedicated storybook steampunk HUD atlas preserving the cast identities, with full heads and waist-up portraits in equally sized cells, no labels or scenery. The final background pass uses flat magenta for alpha extraction, preserving white fur and highlights. Create a production 0–9 stone atlas from the original board, identical square octagonal gold borders, centered readable digits, original jewel palettes and emblems, no titles, labels or variable margins.

Encoding: WebP; generated background removed and cells normalized for browser sprites. Original conversation assets are retained separately. Save schema unchanged.

## Secret chapter 6 — sky voyage (2026-09-14)

Original art generated with OpenAI ImageGen for Miracle Mine. Existing game art was supplied as visual reference; no external stock or paid material was added. Existing licensed music and SFX are reused unchanged (see audio credits).

- `src/assets/sky-world.webp`: a wide, painterly blue-sky panorama of floating islands, cloud valleys, ancient arches and brass observatories. Reference: `dialogue-worlds.webp`. No characters, airplane or text; keep the central gameplay area visually open. Source: `exec-813e72f6-00be-4e03-abf5-672bfcb5deff.png`.
- `src/assets/sky-toto.webp`: Toto from the cast reference, white hair and beard, round spectacles and brass goggles, cream shirt and leather work apron, smiling toward the right while holding a brass copilot wheel. Full head and upper body, padding, isolated on flat magenta. Reference: `dialogue-cast.webp`. Source: `exec-16eb8740-da65-4bed-b103-4cb9f8f914b6.png`.
- `src/assets/sky-treasures.webp`: six original brass-and-gem artifacts in a 3×2 atlas: winged gear, cloud crystal, ancient compass / feather key, star globe, sky pearl crown. Consistent warm fantasy illustration, separate cells, no text, flat magenta backdrop. Source: `exec-ef0d6cfa-1944-4e3c-a6ef-97605737a2ba.png`.

Character and treasure backgrounds were removed by connected magenta-key extraction with one-pixel edge cleanup; cells were trimmed, centered and padded before WebP encoding. Shipped sizes: Toto 512×512, treasure atlas 768×512, sky panorama 1660 pixels wide. Alpha is real transparency. The airplane remains the player's existing customized assembly, rather than replacing their design with a generic new plane.


## 第6章 領域カットイン背景（0.18）

`src/assets/sky-regions/` の `clouds.webp`（雲の海）、`afterglow.webp`（夕映えの回廊）、`stars.webp`（星の高み）、`farsky.webp`（果ての空）は、プロジェクトオーナーが既存の空の風景（`sky-world.webp`）を参考画像として画像生成ツールで作成した本プロジェクト用のオリジナルイラスト。1600×900のWebPに変換して同梱し、`sky-regions.js` の全画面カットイン背景と、その領域を飛んでいる間の空の旅のゲーム背景（`.game-landscape[data-region]`、領域が変わるとクロスフェード）に使う。`sky-world.webp` は出発デッキのカードと共有プレビューで引き続き使う。人物・機体・文字は含めない。

## 盤面の枠（0.19.5）

`src/assets/board-frame-add.webp`（青緑の石）と `board-frame-multiply.webp`（紫の石）は、プロジェクトオーナーが画像生成ツールで作成した真鍮の額縁。内側は完全に透明で、盤面の塗り（＋は深い緑 `#123c43`、×は紫 `#3b1f55`）の上に `.board::before/::after` として重ね、演算に合わせてクロスフェードする。元画像 1254×1254 PNG を、外周の薄いにじみ（alpha<90）を落としてから枠の外縁で切り抜き、1024×1024 の透過 WebP にした。内縁の位置（左右 4.21%／4.68%、上下 5.24%／5.63%、盤面内側基準）は CSS の inset に反映済み。角の飾り板が内側へ約1.5%はみ出すため、盤面の padding は 2.4%。
