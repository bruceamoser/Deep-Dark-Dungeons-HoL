# Current working progress

Updated: 2026-11-09 (America/New_York).

## Baseline

- Product: **Four Lanterns Deep**; canonical repository `bruceamoser/Four-Lanterns-Deep`.
- Latest released version: **[v0.8.4](https://github.com/bruceamoser/Four-Lanterns-Deep/releases/tag/v0.8.4)**. Game release baseline: `7bca1b6` (PR #103).
- Progression remains the v0.6 Discipline Forge. See [implementation status](../implementation-status.md), [adaptations](../computer-game-deltas.md) and [release process](../releases.md).

## Current task

**v0.8.5 release in progress.** Bruce requested progress docs, commit/push/merge and a new release while away at dinner. The implementation and release preparation are merged in [PR #110](https://github.com/bruceamoser/Four-Lanterns-Deep/pull/110), source commit `23effe99ae9ae3d4ba82e12d4fadb999e125c8a3`, tagged `v0.8.5`. **v0.8.4 remains the published latest until the finished-installer gate succeeds.**

298 unit tests, the complete native Linux regression on the actual 0.8.5 launcher, source-build AppImage/installed Debian/Windows installer CI, the finished licensed local AppImage, isolated Linux-bundle installation and the real 0.8.4→0.8.5 update round trip all pass. Private licensed character exports are verified in both finished app archives. Linux and Windows builds are complete; licensed release files and checksums are under ignored `release/staged-0.8.5/`.

All eight initial assets are uploaded to draft v0.8.5. The final finished-installer gate is running: [42716952200](https://github.com/bruceamoser/Four-Lanterns-Deep/actions/runs/42716952200), pinned to source `23effe9`. The first AppImage job timed out at the camp harness’s 20-second completion wait. QA-only branch `codex/v085-camp-qualification` uses the established 90-second software-rendering budget and captures camp state before cleanup. Assertions and staged app binaries are unchanged. Finished Debian and Windows jobs passed. A local software-rendering run also exposed an initial torch-model-ready flag before the light’s first animation tick; QA now polls the actual active light with the same 0.001 tolerance. Merge the passing QA fix and redispatch the gate from reviewed main; then verify public downloads and the live old-client update feed. See [release handoff](handoffs/2026-11-09-v085-release.md). No manual publish around a failed gate. Further progress docs are on `codex/v085-release-checkpoint` until merged.

Coverage: [creature AI](../creature-ai.md), [AI handoff](handoffs/2026-11-09-creature-tactical-ai.md). Prior camp/water/torch and discipline improvements from #108/#109 are included. Source statistics and encounter budgets are unchanged; play balance remains subject to player feedback.

## Previous delivered task

All eight welcome/HUD/camp touches are implemented and merged in [PR #103](https://github.com/bruceamoser/Four-Lanterns-Deep/pull/103), release commit `7bca1b6`, tag `v0.8.4`.

- Persistent preloaded title screen: click, Enter or Space to enter.
- Illustrated town directory and equipped hero portraits; centered day/time; utility controls under Settings.
- I/M/G/S/L/H/Shift+S/D for town destinations (Shift+S resolves Shrine/Smithy's duplicate S).
- Tab toggles the dungeon map; J toggles its journal.
- Saved dungeon camp reports show actual healing, wound/material changes and full work history; town sleep has a recovery summary. Recall's return-depth badge remains visible.

271 automated tests, 1600/1100 layout checks, the complete native Linux regression and a real 0.8.3→0.8.4 update round trip passed. Source-build installer CI and all three finished licensed installer jobs passed. **v0.8.4 is published**, with Debian, AppImage and Windows NSIS installers. Final qualification: [run 42668867227](https://github.com/bruceamoser/Four-Lanterns-Deep/actions/runs/42668867227).

Public installer checksums (SHA-256) and updater metadata sizes/SHA-512 were verified after downloading the release. An unmodified published 0.8.3 AppImage discovered and downloaded 0.8.4 from its original live feed, with isolated test data.

Qualification follow-ups #104–#106 split Linux installer jobs, allowed software-rendered runtime budgets, and made startup/reload waits consistent. They changed QA tooling and documentation, not the reviewed game binaries. Current staged QA uses its reviewed workflow revision and checks packaging configuration against the immutable game tag.

## Recent local diagnosis

On Bruce's Linux desktop, Debian package `deep-dark-dungeons-hol` was already 0.8.3, but a user-level desktop entry shadowed the system entry and launched a stale 0.6.0 checkout runtime. The user entry was replaced with the installed Four Lanterns Deep entry; KDE's menu cache was rebuilt. The ignored checkout runtime was refreshed from the installed 0.8.3 package; previous runtime and shortcut were backed up locally. Git origin now uses the renamed repository.

The installed executable passed the release smoke flow (rendering, Forge, isolated disk save and update controls) through the user's systemd session. The checkout launch reached the expected 0.8.3 interface; its release smoke assertion for supported updates failed because unpacked copies intentionally report updates unsupported. The agent process's `NoNewPrivs=1` also prevents a direct SUID sandbox test from that process; do not disable sandboxing to bypass it. No real player saves were used or modified by these checks.

## Next agent

1. Follow `AGENTS.md` and the startup process in this folder.
2. v0.8.4 is delivered. Read the latest handoff for verification and local setup notes; no UI qualification task remains.
3. Read the creature AI handoff and coverage doc for the latest source follow-up.
4. Licensed runtime exports have been staged privately from the installed licensed v0.8.3 app and verified (251 nodes, 20 animations, 39 weapon grips). These ignored files do not travel with Git. Preserve finished-release staging rules.

## Transfer gaps

Purchased Dungeon Mason exports, build outputs, saves, local tools and MCP configuration are not transferred by Git. Use [machine setup](machines.md). This repository process preserves explicit project knowledge, not a guarantee that every chat is available on every device.
