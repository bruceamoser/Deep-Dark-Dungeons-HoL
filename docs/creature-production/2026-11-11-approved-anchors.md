# Three approved anchors and sequential production — November 11, 2026

Bruce explicitly approved Goblin Spearhand, Air Elemental and Wolf for the game and requested a humanoid-first workflow for the remaining creatures, one at a time.

## Implemented

- All three exact reviewed private exports are default runtime choices when present, pinned by SHA-256 in `config/approved-creature-assets.json`. No Air/Wolf opt-in flag is needed. Missing private assets retain public fallback models; required delivery builds reject missing assets. Changed bytes at an approved path fail clearly.
- Bestiary preview recognizes the wolf's real `Bite_Front` clip. Its check exercises all five preview states for each installed anchor, alongside the existing complete bestiary review.
- Queue covers all 58 creature IDs exactly once: three integrated anchors, 55 remaining. Commands enforce one active creature, ordered evidence gates and an approved asset before integration. Goblin Scrapper's brief is complete; its modeling has not started.
- Active process is `docs/creature-production/README.md`; AGENTS.md points future sessions to it. Historical full-roster generation plans are superseded. No unattended generator, new paid service or new tool/model installation.
- Source, rig and licensed asset originals remain private and unchanged. New queue/report metadata and reproducible tooling are versioned; private GLBs/installers/media are not.

## Build and validation

The reviewed Git index was materialized into a clean temporary checkout, with only the three approved creature exports plus the existing licensed Dungeon Mason character inputs. Unrelated dirty generator/routing changes were excluded. An initial symlinked node_modules package omitted transitive updater dependencies; it was discarded before any launch/install. A real `npm ci --ignore-scripts` in the clean checkout resolved packaging; the resulting ASAR contains electron-updater and its required dependencies.

`npm test`: 363 passed. Focused queue tests also pass with Goblin Scrapper active. Linux AppImage and Debian packages build. Native launcher and installed-menu checks passed; results below. No Windows runtime or public release is implied by these Linux checks.

The approved mesh bytes match the prior qualified candidates: Spearhand 29,454 triangles/43 bones, Air 25,736 triangles/runtime object clips, Wolf 118,007 triangles/23 bones. Approval does not erase the previously documented gait, ground contact or shape limitations.

## Delivery

Local AppImage and `.deb` retain source version 0.8.7; they are unpublished local art builds, not replacements of immutable GitHub release files. The per-user menu AppImage is the target for local installation; personal saves/audio preferences and system Debian installation are preserved. Native tests use muted audio, isolated saves, ordinary terminal AppArmor context and enabled Chromium sandboxing. Models/media require separate private transfer to another machine.

## Final native and installed results

| Target | Average FPS | p95 |
| --- | ---: | ---: |
| Goblin Spearhand | 59.70 | 16.8 ms |
| Air Elemental | 59.45 | 16.8 ms |
| Wolf | 59.65 | 16.8 ms |
| Installed AppImage (Wolf encounter + bestiary) | 59.50 | 16.8 ms |

All encounters used six opponents and four heroes, 1600×1000/DPR 1 on one RTX 3090, all five motion states, full death playback and no JavaScript errors. The installed bestiary check also passed all 58 model/art pairings, all five states on each approved anchor (including actual Wolf `Bite_Front`), one reusable WebGL context, drag/zoom/keyboard controls, search, 1280px layout and dialog cleanup. Personal saves were not used. These short refresh-capped checks are not a universal performance guarantee.

Installed AppImage SHA-256 (matches built artifact): `f0b91fe5ac949a7f20dcf7facde126e61bc90c05b71ea4c0a499aad3516dc3e0`. Normal menu entry remains Four Lanterns Deep. Restart an already-running game to load this build. New local Debian package: `release/Four-Lanterns-Deep-0.8.7-amd64.deb`.
