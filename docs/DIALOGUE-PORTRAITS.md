# Dialogue portrait framing repair

Generated with the built-in OpenAI image tool in identity-preserve edit mode. Original design references and atlases remain unchanged. Output PNGs were converted to WebP at quality 92 without resizing.

- `src/assets/dialogue-cast-safe.webp`: 1774 × 887, eight portraits, 4 × 2 atlas. Source generation: exec-ee6710e0-e653-475b-b35e-6d39500e2433.png.
- `src/assets/cast-expressions-safe.webp`: 1086 × 1448, twelve expressions, 3 × 4 atlas. Source generation: exec-77f79e57-fa2b-45f3-a118-10b227320fc9.png.

## Prompt set

Base cast edit: Preserve exact four-column, two-row layout, all eight characters, expressions, poses, colors, facing directions and painterly anime detail. Reframe each upper-body portrait inside its own square cell, asking for 8% top/side whitespace and 4% below. Complete missing scarf tips, fingers, leaves, ears, crystals or flames. No silhouette cut at the cell boundary or neighboring-cell contamination. Pure white background, no borders, text or extra shadows. Row one: talking Luka, Toto, Moss, Shell. Row two: crystal mole, lava lizard, white wind fox, thoughtful listening Luka.

Expression edit: Preserve three-column, four-row layout and twelve identities, expressions, poses and facing directions. Reframe each bust smaller with empty space above and both sides; keep pointed finger, sprouts, ears, crystals, whiskers, bubbles and flames entirely visible. Complete missing outlines naturally; preserve waist baseline. Pure white background, no borders or labels. Row one: listening Toto, Moss, Shell. Row two: listening mole, lizard, fox. Row three: Toto with blueprint, pointing surprised Moss, delighted Shell. Row four: worried mole, celebrating lizard, laughing fox.

## Rendering and verification

Removed the extra percentage clip on expressions. Expression atlas rows use 362-pixel square source windows at y=0,362,710,1050: the last two generated rows are slightly above the nominal grid, so these windows preserve tips and exclude neighboring sprites. Base portraits keep their original 4 × 2 square windows.

ResizeObserver fits actors between the measured header and text box, also clearing the goal in portrait orientation. Only the deliberate waist baseline remains behind the text box. Existing dialogue typing, expression changes and opening fade are retained.

Browser audit: six conversation partners × listening/talking/emotion × 852×393,390×844,1536×709,667×375 = 72 cases. Checked actor bounds, header clearance, no rectangle clip and representative screenshots for every character. Both Luka expressions appear across these cases. Existing save schema and game portraits are untouched.
