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
| merge stones | Interface Sounds | drop_002.ogg |
| correct answer | Interface Sounds | confirmation_002.ogg |
| stage clear | Music Jingles | Sax jingles/jingles_SAX07.ogg |
| hint | Interface Sounds | question_001.ogg |
| manual shuffle | Interface Sounds | scroll_001.ogg |
| assembly / customization | Interface Sounds | switch_003.ogg |
| retry / time up | Interface Sounds | error_003.ogg |
| chapter clear | Music Jingles | Sax jingles/jingles_SAX07.ogg |
| chapter arrival / resume | Music Jingles | Steel jingles/jingles_STEEL07.ogg |
| stage goal announcement | Music Jingles | Pizzicato jingles/jingles_PIZZI02.ogg |
| discard stones | Interface Sounds | drop_004.ogg |

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


Version 0.9 updates clear/chapter to a longer sax jingle and adds chapter arrival, stage announcement and a single-hit discard sound. These five files use 128 kbps mono MP3. All remain CC0 recordings.
