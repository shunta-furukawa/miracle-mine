# Miracle Mine — approved prototype design

## Visual direction
Warm, child-friendly steampunk. Teal, brass, orange. Boy protagonist Luka, grandfather inventor Toto, friendly material guardians. Original character names provisional.
Mine Stones: clipped-corner square brass frame, faceted mineral interior. Large digit plus redundant sigil; not color alone.
Palette 0–9: pearl white, cobalt blue, golden yellow, vermilion, dark emerald, amber, icy cyan, indigo, rose magenta, lavender.
Approved generated mockups are visual references; do not treat the deployment scaffold as final game art.

## Rules
5×5 board. Trace 2+ adjacent tiles, including diagonals. No tile reuse. Backtrack one step to undo. Fixed + or × during each gesture.
Evaluate in this order:
1. Exact target: remove tiles, increment completion count, restore life (even when target >=10).
2. Below target and result 0–9: merge at gesture endpoint.
3. Otherwise: remove selected tiles, no life gain or completion.
Gravity and refill after resolution. Life decreases with time. Pause during dialogue/tutorial/animations.

## Story (5 chapters × 6 stages)
Forest: repair waterwheel; wood wings and frame. Target 6. Spawn 1–3 initially, then 0–5.
Sea: repair harbor pump; hull/tail materials. Target 8. Spawn 0–7.
Cave: light tunnels; crystal power core/instruments. Target 10. Spawn 0–9.
Volcano: fire the forge; boiler/engine. Targets 12,18,24,36. Unlock multiplication.
Highlands: assemble and flight test. Targets 20,28,32,36,48,64.
Finale: first flight with grandfather, glimpse a new island.
Each chapter: introduction, practice, application, new trick, combination, part completion.
Beginning/end dialogues stay short. Failure loses no earned material.

## Initial tuning (playtest required)
Forest: life 60s, success +10s, 3–8 completions.
Sea: 55s, +8s, 8–12.
Cave: 50s, +8s, 10–14.
Volcano: 65s, +12s, 6–10.
Highlands: 60s, +10s, 8–12.
Life capped at maximum. Provide early solutions; offer slower life loss after repeated failures.
Merged one-digit values may exceed the current spawn range.

## Modes and persistence
Story: choose 1 of 3 localStorage save slots. Persist cleared stages, materials, cosmetic airplane parts.
Score attack: fixed 180s; no time extension; separate addition/mixed best scores.
Endless: successes restore life; targets evolve; addition-only option.
Saves stay in the same browser/device; no account/backend, purchases, or advertising.

## Airplane customization
Wings, paint, propeller, decoration; 2–3 choices per part initially. Cosmetic only.

## Verification before gameplay release
Touch tracing and backtracking, 0 behavior, multiplication, exact-target priority for 10/36, merges and gravity, pause timing, persistence/reload, mobile landscape/safe areas, color-vision simulation and readable digits.
