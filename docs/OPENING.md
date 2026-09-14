# Illustrated opening

An approximately 20-second, five-shot opening plays when a new save slot is created, before the existing prologue dialogue. Existing slots bypass it automatically; the map's 「はじまりの物語」 button replays it. No save schema, rankings, or existing progress is changed.

The final workshop shot holds for seven seconds, followed by an 850 ms fade to true black. The dialogue then fades in over 1.25 seconds (including a short black hold); its first line starts typing after the reveal. The black backdrop lives in the dialogue’s native modal layer to prevent a map flash. Reduced-motion mode transitions immediately.

The player can skip or pause. Hidden pages pause the timeline and camera. Reduced-motion mode uses still images without moving particles. Music and the arrival cue reuse the existing licensed soundtrack and respect the player's sound settings. No video file or synthesized music is used.

Sequence: floating islands → forest waterwheel → harbor → crystal cavern → Luka beside the unfinished wingless airplane. Runtime camera movement and atmospheric layers use CSS/Web Animations; captions remain selectable DOM text. Assets are precached by the existing service worker.

## New artwork

Built-in OpenAI image generation was used (not the fallback CLI).

- Project asset: `src/assets/opening-workshop.webp` (1660×949; 343208 bytes).
- Original generated PNG: `exec-56d553bf-a650-473a-b141-1e7315e04508.png`.
- References: `src/assets/game-cast.webp` for Luka, `src/assets/workshop.webp` for the visual world. The wingless fuselage is intentional: the following dialogue asks why the airplane has no wings.
- Other shots reuse `sky-world.webp` and cells 1, 2 and 3 of `dialogue-worlds.webp`.

Final generation prompt:

Use case: illustration-story. Create ONE new cinematic opening illustration for the game Miracle Mine, wide landscape 1792x1024. References: image 1 is the established character sheet; only Luka (top-left boy) is relevant. Image 2 is a style and world reference, NOT a composition to duplicate. Keep Luka's brown tousled hair, brass goggles, teal short jacket, orange scarf and boyish proportions. Scene: early morning inside a warm wooden cliffside inventor's workshop opening onto an immense luminous blue sky with distant floating islands. Luka stands in the central 45-60% of the picture, shown from behind in gentle three-quarter profile, head tilted toward the sky with quiet hopeful wonder. In the central foreground beside him is a SMALL CLEARLY UNFINISHED steam airplane fuselage on wooden trestles: open wooden ribs, a few teal metal plates and brass engine pieces, NO WINGS, no complete tail, not flight-ready. Its missing wings are essential to the next dialogue. Include a nearby workbench with rolled unlettered plans, loose brass gears and timber. No other characters. Restrained glowing dust in sunbeams, lush painterly storybook anime illustration, detailed handpainted textures, hopeful and intimate rather than action. Most important story elements (Luka head and incomplete plane) grouped within central 40% of width so a vertical mobile crop remains legible. Leave bottom 20% calm for overlaid captions. No written text, no logo, no panels, no borders.
