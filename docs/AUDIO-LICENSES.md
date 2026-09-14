# Miracle Mine audio credits and provenance

Retrieved and checked on 2026-09-14. These are existing recordings, not generated
music, synthesized sound effects, commissioned work, or an original soundtrack.
The audio files have their own licenses; any source-code license does not replace them.

## Music — PeriTune / むつき醒 (Sei Mutsuki)

Licensed under **Creative Commons Attribution 4.0 International (CC BY 4.0)**:
https://creativecommons.org/licenses/by/4.0/
Legal code: https://creativecommons.org/licenses/by/4.0/legalcode

| File | Original title | Use | Original publication / source |
| --- | --- | --- | --- |
| `src/assets/audio/breeze.mp3` | Breeze | Title and flight | https://peritune.com/blog/2017/03/02/breeze/ |
| `src/assets/audio/windmill-village.mp3` | Windmill_Village | Save selection, map and workshop | https://peritune.com/blog/2021/12/29/windmill_village/ |
| `src/assets/audio/wonder6.mp3` | Wonder6 | All puzzle modes | https://peritune.com/blog/2019/01/19/wonder6/ |

Changes: downloaded the author's free loop packages; used the full OGG loop
recordings, normalized loudness to -20 LUFS (peak ceiling -2 dBTP), and encoded
96 kbps stereo MP3 for browser playback. No composing, melody extraction,
pitch shifting, AI generation, or sampled-instrument synthesis is performed.

Breeze and Wonder6 explicitly display CC BY 4.0 on their original pages.
The author's current policy at https://peritune.com/about/ explicitly preserves
CC BY 4.0 for works published through February 2026, including Windmill_Village.
We rely on these CC licenses, not on the separate license for newer works.
CC BY permits adaptation and redistribution, including the audio files in this
public repository, subject to attribution and the license conditions. Retain
this notice when redistributing. No endorsement by PeriTune is implied.
The license includes warranty and liability disclaimers; see its legal code.

## Effects and chapter jingle — Kenney

Licensed under **Creative Commons Zero 1.0 Universal (CC0)**:
https://creativecommons.org/publicdomain/zero/1.0/

| Game sound | Pack | Original file |
| --- | --- | --- |
| click | Interface Sounds | click_003.ogg |
| back | Interface Sounds | back_001.ogg |
| select stone | Interface Sounds | glass_001.ogg |
| merge stones | Impact Sounds | impactGlass_medium_000.ogg |
| correct answer | Interface Sounds | confirmation_002.ogg |
| stage clear | Music Jingles | Sax jingles/jingles_SAX02.ogg |
| hint | Interface Sounds | question_001.ogg |
| manual shuffle | Interface Sounds | scroll_001.ogg |
| assembly / customization | Interface Sounds | switch_003.ogg |
| retry / time up | Interface Sounds | error_003.ogg |
| chapter clear | Music Jingles | Sax jingles/jingles_SAX02.ogg |
| chapter arrival / resume | Music Jingles | Steel jingles/jingles_STEEL02.ogg |
| stage goal announcement | Music Jingles | Pizzicato jingles/jingles_PIZZI02.ogg |


Sources: https://kenney.nl/assets/interface-sounds and
https://kenney.nl/assets/music-jingles . Both pack pages explicitly state CC0.
Only licensed files inside `Audio/` were used, not preview recordings.
Changes: OGG converted to 96 kbps mono MP3. Playback preserves original pitch.
Pack license notices are retained as `kenney-interface-license.txt` and
`kenney-jingles-license.txt` in this directory.

See `audio-sources.json` for each original file, source URL, SHA-256, output
SHA-256, duration and modification record. In-game credits are available from
Settings. Copyright and license notices must remain with the recordings.

## Playback and saves

- Music and sound effects have independent switches and volumes.
- The audio preferences use `miracle-mine:audio:v1`; adventure saves stay at
  `miracle-mine:v1` with the existing three-slot schema.
- On first use, an existing `settings.sound: false` also defaults new music to off.
- Playback unlocks from a user gesture. The single AudioContext suspends when
  hidden, retries resume on the next gesture, and rejects stale playback requests.
- Only two decoded music buffers are retained; effects have concurrency limits.
- Dialogues, pause/results and the chapter jingle lower BGM volume.
- All audio assets ship in the build and are included in the offline cache.


## Version 0.10 — celebration and distinct panel effects

Clear/chapter use the complete ascending `jingles_SAX02.ogg` recording,
with a quiet 90/180 ms echo tail and a peak limiter. Pitch and melody unchanged.
Merge uses the resonant `impactGlass_medium_000.ogg` from Kenney Impact Sounds:
https://kenney.nl/assets/impact-sounds (CC0; `kenney-impact-license.txt` retained).

Discard uses `bfh1_glass_breaking_06.ogg` by **rubberduck**, from
“75 CC0 breaking / falling / hit sfx” (published 2019-10-08):
https://opengameart.org/content/75-cc0-breaking-falling-hit-sfx
Download: https://opengameart.org/sites/default/files/sfx_breaking_and_falling.zip
The author's asset page explicitly dedicates these sounds under **CC0 1.0**:
https://creativecommons.org/publicdomain/zero/1.0/
Full glass-shattering recording, gain reduced to 70%, MP3 128 kbps mono.
All four replacements use existing CC0 audio; no new music is generated.

## Opening transition and chapter arrival

Chapter arrival/resume uses the ascending Steel 02 recording in full, converted to 128 kbps mono MP3 without changing pitch or melody. Prologue playback has no arrival cue; the first chapter introduction before any clear or failure is also silent. Later chapter introductions and resumes retain the new cue. Opening-to-dialogue music overlaps across the visual blackout and reveal, respecting music volume and mute preferences.
