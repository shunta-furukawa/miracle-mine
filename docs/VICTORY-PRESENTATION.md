# Victory presentation and stable assembly stage

Stage-clear results replace the unexplained diamond medal with a dedicated, joyful Luka illustration. Existing CC0 Kenney SAX02 fanfare (`clear.mp3`) remains synchronized with the result, together with the finite confetti/light effects. The illustration is warmed when the app starts. Navigation never waits for the illustration animation. Reduced motion disables its entrance animation.

The assembly layout bug came from `.airplane-render.customized-plane` overriding the older absolute positioning rule. Both before/after states now occupy the same aspect-ratio stage, so removing the old state cannot change panel height or move the surrounding content. This applies to all five chapters and workshop replays.

Asset: `src/assets/luka-victory.webp`, 640 × 640, transparent WebP. Created with the built-in image generation tool, using `src/assets/game-cast.webp` as character identity/style reference. Source generation: `exec-3ea4ed58-1d40-4aec-ba9e-bf193807fc1d.png`.

Final generation prompt:

> Use case: illustration-story. Create one new dedicated victory character illustration for Miracle Mine stage-clear UI. Reference image: identity and hand-painted anime rendering reference ONLY; use ONLY Luka, the boy in the upper-left cell, no other characters or sprite grid. Luka has tousled chestnut hair, amber eyes, brass goggles on his head, teal engineer jacket, orange scarf, cream shirt, brown fingerless gloves and leather belts. He is delighted after success, wide joyful smile, raising one clenched fist high in a triumphant pose, the other fist near his chest. Dynamic but warm and friendly. Three-quarter body down to upper thighs, natural finished silhouette; fully include raised hand, hair and scarf with generous transparent margins on every edge; do not crop hands or head. Single centered character on a genuinely transparent alpha background, square canvas. Polished detailed fantasy game illustration matching reference. No text, medals, badges, scenery, extra characters or background glow. This is a new pose, not a crop of the reference.

No save schema, ranking protocol, rules, or audio licensing changes.
