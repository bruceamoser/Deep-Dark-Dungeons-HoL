# Implementation status — v0.3.0

An early playable desktop dungeon RPG. Rules decisions are now explicit; bespoke art, encounter balance and final presentation still need work.

## Playable

- Four equipped animated heroes, isometric camera, real-time exploration and alternating-side HoL combat. Formations, individual combat movement, ally passage, ground-grab pan and zoom.
- 58 source-book creatures, party/depth encounter budgets, bosses every fifth floor, procedural slotted magic equipment with discipline requirements, six merchants and paired town recall scrolls.
- Full staged source character validation, visible culture/background grants, discipline filters, separate purchase dialogs, 90 usable class signatures, all 50 ancestry traits with documented game behavior, and 205 supported abilities overall.
- The remaining 222 source abilities are deliberately retired from new training. Legacy purchases and source text remain intact; town retraining offers legal replacements at the original DP cost and stage without deleting XP, injuries or possessions. Published source presets retain their legacy purchases for compatibility.
- All origin grant pairs have a usable dungeon benefit. Game rules appear before expandable original rules. A/M/R/P badges reflect the actual game action. The sheet exposes daily trait preparation, favorites and explicit equip/stow controls.
- Opportunity attacks interrupt voluntary departure, casting, standing and inventory handling before effects. Player reactions are optional, NPC reactions automatic; saved pending decisions resume. Forced movement and Disengage do not provoke.
- Source wounds, death marks, Last Words, Grit, typed conditions, healing and daily treatment. Sleep does not grant Grit or remove injuries.
- Persistent world clock, daily automatic food/water use, supply exhaustion alerts, fatigue after 16 hours awake, eight-hour sleep with possible dungeon ambushes.
- Torches occupy one hand, automatically douse in fixed/magical light, and check supplies per 30 burning minutes. Light falloff imposes visual Banes; low-light vision reduces those Banes, never grants darkvision. Seismic sense detects grounded creatures. Remembered floors remain navigable when dark.
- Town crafting for torches, arrows, food, cord, healing bottles and smoke flasks: knowledge, tools, compatible paid materials, source progress/supply steps and time. Field harvesting uses a single finite edible patch per floor.
- Named independent saved journeys, active/reserve hero repository, Hall of Fallen Heroes, shared expedition XP and earned town development.
- Linux AppImage and Debian packages, Windows NSIS installer, GitHub release update checks/downloads and save-before-install. The Debian package supplies its own configured Chromium helper.

## Remaining limits

- Many source abilities have substantial replacements, including dialogue, investigation, summons and free-form expertise. Summon replacements are immediate support/attack effects, not autonomous creatures. Ground-targeted areas, vertical traversal, water environments, broad social simulation and full stealth remain outside this roster. This is a curated computer game, not complete tabletop simulation.
- Class/trait balance and long-run economy need playtesting. Similar tactical functions intentionally share a non-stacking effect category; repeatedly casting a buff does not multiply its strength. Once-per-encounter signatures reset on a new encounter.
- Creature alternate actions, full footprint variety, exceptional anatomical wound remedies and expedition rescue remain incomplete. Current time/food/fatigue/lighting policies are game adaptations.
- Current models are a first art pass. Full ancestry appearance, bespoke equipment sets, polished animation blending, authored room variety, designed town spaces, production audio, accessibility and performance tuning remain future work.

The per-card decisions and pinned hashes are in [ability-coverage.json](ability-coverage.json). [computer-game-deltas.md](computer-game-deltas.md) records adaptations; [validation.md](validation.md) records executed checks. Original book/Foundry files and vendored source rules are unchanged.
