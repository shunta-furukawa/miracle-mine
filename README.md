# Miracle Mine

Steampunk number puzzle adventure.

無料で遊べる、子ども向けの数字パズル。横画面を基本にスマホ・タブレット・PCに対応する予定です。

## Current status

Released 1.0.0 on 2026-09-17 at https://miracle-mine.vercel.app. 30 story stages, three local save slots, score attack, endless mode, the hidden sky voyage chapter with a seasonal leaderboard, share cards, and an installable offline PWA.
See [game design](docs/game-design.md) for the approved prototype scope.

## Development

Node.js 22 or later. Runtime dependencies are used only by the Vercel Functions (`api/`).

```sh
npm run build
npm run preview
```

Open http://localhost:3000. The build copies `src/` to `dist/`.

## About page, version and contact

`/about` (served from `src/about.html` through a `vercel.json` rewrite and precached for offline use) carries how to play, target age, privacy notes, credits, terms and the contact channel (X: [@MiracleMine0123](https://x.com/MiracleMine0123)). The settings dialog links to both. The title screen and settings show the version, which `scripts/build.mjs` injects from `package.json` into `app.js` and `about.html` (`__VERSION__`); bump `package.json` and `package-lock.json` together. While the major version is 0 the label reads `PROTOTYPE`.

Vercel Web Analytics is loaded from `/_vercel/insights/script.js` on both pages (cookieless page views); Web Analytics is enabled for the project; if it is ever re-enabled, redeploy afterwards, because the script route is wired in at deploy time (until then it returns 404 harmlessly). Headless and automated browsers are excluded by the script itself.

## Continuous integration and deployment

`.github/workflows/test.yml` runs `npm ci`, `npm test` and `npm run build` on every pull request and push to `main`. Production is deployed manually from a specific `main` commit; see [docs/DEPLOY.md](docs/DEPLOY.md).

## Vercel

Import this GitHub repository as a Vercel project.
Framework: Other. Build command: `npm run build`. Output directory: `dist`.
No environment variables or paid services are required by this scaffold.
Production branch: `main`. Git integration must be enabled in Vercel for automatic deployments.

## Prototype limitations

- Airplane paint changes the preview; wing/propeller/emblem choices are saved as design records, not separate rendered aircraft yet.
- Five chapters have distinct missions, targets, and atmospheric tints; the base landscape illustration is shared.
- Balance values have been tuned through playtesting with the intended players; further adjustment follows release feedback.
- Color, digits, and mineral sigils are redundant cues; iPhone testing is done, formal color-vision simulation remains.
- In-stage progress is not persisted; cleared stages and customization are saved.

## Tests

Run `npm test` for the puzzle rules, initial solvability and save validation.

## Art

`src/assets/` contains original generated artwork approved for this project. The stone atlas is displayed using CSS sprite coordinates. No external asset URLs or paid runtime services are required.

## Sharing (0.17)

Every milestone screen (title, settings, save list, stage/chapter clear, workshop, sky voyage departure and return, treasures, own ranking row) opens a share dialog with a 1200×630 card, an X post link, image download, link copy and the OS share sheet. `/api/share?s=…` serves the landing page with OGP metadata and `&image=1` renders the PNG from the game's own sprites with `@vercel/og` and `sharp`. The URL carries only a public snapshot; see [docs/SHARING.md](docs/SHARING.md).

## Three-star ratings (0.19)

Every story stage records play time and how many traces broke stones instead of hitting the goal or merging. Three stars need the chapter's pace and no breaks, two stars allow a slower time and up to two breaks; the best record per stage is kept in the save and shown on the map, save list, clear screen and stage intro. Thresholds live in `src/stars.js`; see [docs/STARS.md](docs/STARS.md).

## Home-screen app (PWA)

Use Safari → Share → Add to Home Screen on iPhone/iPad, or the browser install action on Android/desktop. The manifest requests standalone display and landscape orientation; platform support determines orientation behavior. Icons include Apple 180px, standard 192/512px, and a separately padded maskable 512px asset.

The build generates a content-versioned service worker which atomically precaches the complete game for offline use after the first successful online load. Updates wait; a title-screen button activates them without automatically reloading during play. No save keys are changed. iOS may keep home-screen app storage separate from Safari storage.

Icon artwork was generated specifically for Miracle Mine; raster exports are packaged in `src/icons/`.

## Story conversations (0.3)

`src/story.js` defines the prologue, 30 pre-stage conversations, five chapter rewards, and first-flight ending. Stage objectives are taken from `data.js`. `dialogue.js` renders native text with typewriter reveal, speaker emphasis, Luka speaking/listening poses, keyboard/touch advance and skip. Reduced-motion users see complete text immediately. The game remains paused throughout each scene. The map's 「はじまりの物語」 replays the prologue for existing saves.

The cast and six environment atlases are original generated assets stored in `src/assets/dialogue-*.webp`; they are included in the offline cache automatically. Portrait motion is a lightweight speaking gesture, not audio-driven lip sync. Asset generation used the built-in image tool with the approved character sheet and Fuu mockup as references: an eight-cell conversational portrait atlas (Luka speaking, Toto, Mos, Shell, Krim, Flare, Fuu, Luka listening) and a six-cell scenery atlas (workshop, forest, harbor, cavern, forge, sky). The final portrait background is white and composited with CSS multiply over a pale scenery wash.

## Chapter presentation (0.4)

`src/chapter-scenes.js` adds a full-field title card before each chapter's first-stage conversation. Completing the sixth stage saves progress immediately and opens a chapter-clear celebration with the awarded airplane part and collection progress. Continue leads directly into the next chapter's title, then its conversation and puzzle; the final chapter leads to the first-flight conversation. The reward screen includes the guardian's closing message instead of an additional dialogue/result sequence. Replaying a chapter's first stage also replays its title. Every transition is explicitly advanced, keeps gameplay paused, traps focus in a native dialog, and respects reduced motion. Backgrounds reuse the locally cached scenery atlas.

## Delete a save slot

Occupied slots have a separate 「データを消す」 button. The confirmation names the workshop and displays its stage/part progress, with Cancel focused by default. Confirming removes only that story slot; other slots, high scores and settings remain. Storage is updated before the UI reports success. A failed write keeps the existing save and displays an error in the dialog; if that record changed after confirmation opened, deletion is cancelled and the user is asked to review it again.

## Fullscreen home-screen launch

The manifest requests `display: fullscreen` to hide system/browser chrome where supported (for example Android Chromium). Unsupported environments fall back to standalone display. PWA detection handles both fullscreen and standalone. iOS's existing `black-translucent` status-bar styling is retained; it is not a switch that hides clock/battery indicators. Actual system-bar visibility is controlled by the OS/browser and must be verified on the device. Existing installs may apply manifest changes later than the app's service-worker update; close and reopen after updating without clearing saved data.

## Illustrated assembly and expressions (0.5)

- Conversation scenery preserves the atlas cell's 2:1 aspect ratio in both orientations. Portrait layouts crop the sides rather than squeezing the landscape.
- Toto, Mos, Shell, Krim, Flare and Fuu each have listening and character-specific emotional portraits in addition to their speaking pose. Chapter introductions and the prologue/ending select explicit emotional poses; the listener switches to a closed-mouth portrait.
- `airplane.js` derives five collected parts and six cumulative assembly states directly from existing chapter-clear IDs. No save migration or reset is needed. Save cards and the workshop use the same rendering and collection state.
- A newly completed chapter sends its item toward the aircraft, flashes at attachment, and transitions to the next assembly image. Progress is saved before this presentation; replaying a cleared stage does not rebuild or remove an already collected part. Reduced-motion mode shows the completed state immediately, and Next remains available throughout.
- The workshop includes a larger aircraft display, illustrated inventory, assembly timeline, and a replay of collected upgrades. Existing paint settings tint the preview. The pre-existing wing/propeller/emblem choices remain design notes, clearly labeled in the UI.

Original project art was generated with the built-in image-generation tool using the approved cast and airplane concept as references. `assets/cast-expressions.webp` is a 3×4 portrait atlas (six listening, then six emotional poses). `assets/airplane-stages.webp` is a 2×3 assembly atlas (bare chassis; wooden wings/frame; teal hull/tail; crystal core/instruments; boiler/propeller; final compass stabilizer). `assets/airplane-parts.webp` is a 3×2 inventory atlas (the five corresponding component groups plus a toolbox). Prompts required consistent identities, cumulative airplane construction, fixed perspective, pure-white backgrounds, no text, and isolated grid cells. The airplane sheet received a padding/layout correction; CSS clips cell edges to prevent neighboring art from bleeding. Source artwork is packaged as WebP and precached with the game.

## Visible aircraft customization (0.6)

Design notes are now rendered components in the workshop, save cards and chapter assembly presentations. Three generated six-stage airframe atlases provide straight, elliptical and biplane wings. A separate accessory atlas supplies two/three/four-blade propellers and star/moon/leaf badges, so choices combine independently. Paint tints the airframe while accessory colors stay stable.

Wings unlock with the forest component; paint and emblems with the ocean hull; propellers with the volcano engine. Saved choices are preserved and only appear after the relevant component is assembled. Changes update the preview in place, retain keyboard focus and save before reporting success. The preview stays near the controls on small screens. All artwork is precached for offline play.

## Illustrated title (0.7)

The title uses alpha-preserving generated WebP assets: `src/assets/title-logo.webp` and `src/assets/menu-icons.webp`. The portrait layout presents the existing workshop illustration in its own wide scene beneath the logo, preserving character visibility. Landscape keeps the full-screen artwork. Main menu labels explicitly use dark brown, including WebKit text fill; storybook headings prefer the system Japanese Mincho font with readable fallbacks. Dialogue and puzzle typography are unchanged. Safe-area spacing remains applied.

Built-in image generation prompts: (1) “Miracle Mine” on two compact lines, custom ivory/gold storybook serif lettering, dark teal outline, brass gears, cyan crystal and steam-airplane wings; isolated transparent logo, no extra text. (2) A 3×2 atlas of matching brass/teal medallions: map/compass, stopwatch/trophy, infinity/crystals, instruction book, gear/wrench, airplane/hangar; bold readable silhouettes, no captions. The generated alpha channels are preserved during WebP encoding. Original workshop art is reused without stretching or editing.

## Licensed soundtrack (0.8)

Breeze (title/flight), Windmill_Village (map/workshop), and Wonder6 (puzzles)
by PeriTune use the author's CC BY 4.0 loop recordings. Ten sound effects and
a chapter jingle use Kenney CC0 recordings. Settings include independent BGM
and SE switches/volumes and visible attribution. The title has a music button.
No music or sound-effect synthesis is used. See [audio licenses](docs/AUDIO-LICENSES.md)
and [asset provenance](docs/audio-sources.json).

The single Web Audio context unlocks on a gesture, fades between scenes, ducks
under dialogue/results, and suspends when hidden. Pending requests cannot
restart a stale scene or muted effect. Audio settings are stored separately
from the three adventure slots and inherit the existing mute preference.
All recordings are bundled and available offline after the app cache is ready.

## 空の旅ランキング

v0.16から、完成した飛行機に名前を付けて、機体デザイン付きの任意参加ランキングに挑戦できます。v0.18で第6章のお題は旅ごとにサーバー発行のシードから生成されるようになり（2個→3個→4個→5個の石のかけ算、5個は30問ごとに再抽選）、ランキングはシーズン制になりました。過去シーズンの記録は閲覧できます。VercelへNeon Freeを接続する手順は [ランキング設定](docs/RANKING-SETUP.md) を参照してください。未接続でも通常のゲームは遊べます。

機体名はランキングと共有カードで公開されるため、`src/name-filter.js` で保存前・出発時・表示時・カード描画時に検査します（不適切語と連絡先を拒否）。リストの追加はこのファイルの配列に足すだけで、`npm test` の `name-filter` テストで誤検知を確認してください。
