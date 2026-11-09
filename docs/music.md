# Four Lanterns Deep soundtrack

Bruce auditioned the candidates on November 8, 2026 and approved:

| Context | Track | Composer | Original source |
| --- | --- | --- | --- |
| Exploration | Fantasy Soundscape | Alexander Nakarada | [CreatorChords](https://creatorchords.com/music/fantasy-soundscape/) |
| Battle | Battle Loop | Alexander Nakarada | [CreatorChords](https://creatorchords.com/music/battle-loop/) |
| Greyhaven | Tavern Loop One | Alexander Nakarada | [CreatorChords](https://creatorchords.com/music/tavern-loop-one/) |
| Dungeon camp | Windswept | Kevin MacLeod | [Incompetech](https://incompetech.com/music/royalty-free/index.html?Search=Search&isrc=USUAN1100757) |

He rejected Tranquil Fields for camp and requested classical acoustic guitar with
strings behind it, then approved Windswept. Do not restore the rejected camp cue.

All four tracks are offered by their creators under CC BY 4.0, with no purchase or
subscription. [CreatorChords licensing](https://creatorchords.com/licensing-info/),
[Incompetech licensing](https://incompetech.com/music/royalty-free/licenses/) and
[the CC BY 4.0 terms](https://creativecommons.org/licenses/by/4.0/) cover credited
use, adaptation and redistribution, including commercial projects. Music rights
do not license the game or HoL material. No attribution-free licence is purchased.

Original MP3 recordings are bundled unchanged in `public/audio/music`. Download
URLs, SHA-256, size, duration and approval date are recorded in
[the provenance manifest](music-provenance.json). Credit text ships in
`CREDITS.txt` beside the audio, and Sound exposes titles, creators, original track
links and licence links. Runtime changes are gain adjustment and crossfades.
For videos containing the music, creators request attribution in the description;
the bundled credits provide the relevant titles and links.

Music starts after user interaction. Game state selects town, exploration or
battle; the dungeon-camp dialog selects camp, with combat taking priority if
interrupted. Repeated renders do not restart a song. Two streaming sources fade
at a transition or end-of-track handoff, so whole decoded songs are not retained
in memory. A newer scene cancels a pending older download. Failed audio leaves
gameplay available and can retry through the sound controls.

Master volume/mute control the whole mix. Music volume/mute and effects volume
persist independently. Original wind, footsteps, impacts and spell synthesis are
retained on the effects bus. No online streaming service is required at runtime.

### Continuous loops (#82)

Recordings decode before playback. Two sources overlap for 1.5 seconds using
equal-power curves scheduled on the Web Audio clock. The next source is already
scheduled before its predecessor starts; native audio-element looping and late
timeupdate handoffs are no longer used. Scene changes fade on a separate track
gain and cancelled downloads cannot replace the current scene. The original
credited MP3 files are unchanged. Native verification measures output across
the actual Battle Loop ending and beginning, with sound effects muted.
