# Arithmetic mode feedback

Addition uses turquoise (#64ffe1), multiplication uses violet (#ce9aff). Image controls retain button labels, aria-pressed and the original multiplication unlock. Selection outline, trace, equation ink and running-value bubbles share the operation theme. Bubbles include + or × as well as color. Each new stone replaces the previous running-value bubble to avoid clutter.

A double tap is two short stationary taps (each <=250 ms, <=12 px travel) on the same stone, released within 320 ms and within 24 px of each other using the same pointer type. It requires a one-stone selection and unlocked multiplication. Toggling preserves that first stone. Slow taps, long presses, drags, cancellation and multi-stone selections cannot toggle. Existing release-to-commit timing has no added delay. Buttons remain available; one-stone selections can also switch via button.

Switching produces a colored ring, sparks and an explicit Japanese operation label, using the existing licensed assemble and success samples. Reduced motion shows a static label. Transient effects have no pointer interaction. Each gather animation captures its own operation color, so later mode changes do not recolor an earlier in-flight trace. Saves, score calculations and ranking verification are unchanged.

## Generated artwork

Built-in OpenAI image generation, no CLI fallback. Asset: `src/assets/operation-medallions.webp` (768 × 384, two equal square cells, alpha preserved). Generated source: `exec-7a17196c-21c4-4465-b66d-3c6b8f00abe6.png`. Format conversion and scaling: FFmpeg, WebP quality 92.

Prompt: Create a game UI sprite atlas: exactly TWO matching circular steampunk arithmetic mode buttons, side by side in an exact 2 columns × 1 row grid, square cells, total aspect 2:1. Transparent background with real alpha. Each medallion entirely inside its own cell with 8% transparent margin on all sides. Left: luminous turquoise teal emerald enamel glass face, ornate but readable brass gold mechanical rim, big crisp ivory PLUS symbol + in center, no other text. Right: luminous amethyst violet enamel glass face, matching ornate brass gold mechanical rim, big crisp ivory MULTIPLICATION CROSS × in center (diagonal X, not plus), no other text. Friendly painterly fantasy adventure game, hand-painted dimensional material, subtle jewels, warm worn brass consistent with a storybook steam airplane workshop. Both icons equally sized and centered at 25% and 75% canvas width and 50% height. High readability at 48px. No outside particles, no letters, no labels, no interface mockup, no scenery. Full uncut silhouette and clean transparent edges.

## Verification

Unit tests cover gesture boundaries and pointer identity. Browser checks cover mouse and touch double taps, preservation of first stone, correct multiplication running totals/colors, no toggling during drag, concurrent resolve/next gesture, slow taps, button fallback, portrait/landscape layout, reduced motion, chapter unlock and existing saves.
