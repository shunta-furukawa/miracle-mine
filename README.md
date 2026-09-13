# Miracle Mine

Steampunk number puzzle adventure.

無料で遊べる、子ども向けの数字パズル。横画面を基本にスマホ・タブレット・PCに対応する予定です。

## Current status

Repository and deployment foundation. The game itself is not implemented yet.
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

## Planned implementation

1. 5×5 pointer/touch puzzle engine, merging and target evaluation.
2. Forest chapter, localStorage saves (3 slots), workshop.
3. Multiplication trial and all 30 story stages.
4. Score attack and endless modes.
5. Responsive and color-vision accessibility testing.
