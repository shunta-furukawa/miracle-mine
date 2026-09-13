# Miracle Mine

Steampunk number puzzle adventure.

無料で遊べる、子ども向けの数字パズル。横画面を基本にスマホ・タブレット・PCに対応する予定です。

## Current status

Playable prototype: 30 story stages, three local save slots, score attack, endless mode, pointer/keyboard input, sound effects, and workshop design records.
See [game design](docs/game-design.md) for the approved prototype scope.

## Development

Node.js 22 or later. No runtime dependencies.

```sh
npm run build
npm run preview
```

Open http://localhost:3000. The build copies `src/` to `dist/`.

## Vercel

Import this GitHub repository as a Vercel project.
Framework: Other. Build command: `npm run build`. Output directory: `dist`.
No environment variables or paid services are required by this scaffold.
Production branch: `main`. Git integration must be enabled in Vercel for automatic deployments.

## Prototype limitations

- Airplane paint changes the preview; wing/propeller/emblem choices are saved as design records, not separate rendered aircraft yet.
- Five chapters have distinct missions, targets, and atmospheric tints; the base landscape illustration is shared.
- Balance values are initial settings and need playtesting with the intended player.
- Color, digits, and mineral sigils are redundant cues; formal color-vision simulation and physical iPhone testing remain.
- In-stage progress is not persisted; cleared stages and customization are saved.

## Tests

Run `npm test` for the puzzle rules, initial solvability and save validation.

## Art

`src/assets/` contains original generated artwork approved for this project. The stone atlas is displayed using CSS sprite coordinates. No external asset URLs or paid runtime services are required.
