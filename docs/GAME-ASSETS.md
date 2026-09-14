# Dedicated puzzle assets (0.12)

Created with the built-in image generation tool using the existing cast and stone design boards as references. No third-party characters or stock artwork added.

- `src/assets/game-cast.webp`: 3 × 2 atlas of square portraits, ordered Luka / Moss / Shell / Crim / Flare / Fuu. Complete heads, friendly poses and consistent transparent padding; displayed inside separate portrait areas so text cannot cover faces.
- `src/assets/game-stones.webp`: 5 × 2 atlas of uniform square tiles, ordered 0–4 / 5–9, retaining each original colour and elemental emblem. Each tile is normalized to 256 × 256 without design-sheet captions or surrounding paper. Game buttons use regular atlas coordinates.

Prompt set: create a dedicated storybook steampunk HUD atlas preserving the cast identities, with full heads and waist-up portraits in equally sized cells, no labels or scenery. The final background pass uses flat magenta for alpha extraction, preserving white fur and highlights. Create a production 0–9 stone atlas from the original board, identical square octagonal gold borders, centered readable digits, original jewel palettes and emblems, no titles, labels or variable margins.

Encoding: WebP; generated background removed and cells normalized for browser sprites. Original conversation assets are retained separately. Save schema unchanged.
