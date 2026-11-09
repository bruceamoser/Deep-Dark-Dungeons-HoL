# Current working progress

Updated: 2026-11-09 (America/New_York).

## Baseline

- Product: **Four Lanterns Deep**; canonical repository `bruceamoser/Four-Lanterns-Deep`.
- Latest released version at this checkpoint: **v0.8.3**. Release baseline: `7aa7091` (PR #101).
- Progression remains the v0.6 Discipline Forge. See [implementation status](../implementation-status.md), [adaptations](../computer-game-deltas.md) and [release process](../releases.md).

## Current task

Implement Bruce's eight welcome/HUD/camp touches as v0.8.4 on `codex/entry-town-hud-camp-summary`. Entry waits for preload and explicit click/Enter/Space; Greyhaven gets the requested building directory and rendered hero portraits; clock is centered; top tools move under Settings; Tab/J toggle map/journal; completed camps retain actual result reports. Duplicate S shortcuts use S for Smithy and Shift+S for Shrine.

Implementation and initial checks are complete. 271 automated tests and the dedicated browser/native HUD flow pass. Full native regression, compact layout checks and finished installer qualification are part of the release gate; consult the PR and latest dated handoff for final outcomes. Do not assume a working version is already the public latest release.

## Recent local diagnosis

On Bruce's Linux desktop, Debian package `deep-dark-dungeons-hol` was already 0.8.3, but a user-level desktop entry shadowed the system entry and launched a stale 0.6.0 checkout runtime. The user entry was replaced with the installed Four Lanterns Deep entry; KDE's menu cache was rebuilt. The ignored checkout runtime was refreshed from the installed 0.8.3 package; previous runtime and shortcut were backed up locally. Git origin now uses the renamed repository.

The installed executable passed the release smoke flow (rendering, Forge, isolated disk save and update controls) through the user's systemd session. The checkout launch reached the expected 0.8.3 interface; its release smoke assertion for supported updates failed because unpacked copies intentionally report updates unsupported. The agent process's `NoNewPrivs=1` also prevents a direct SUID sandbox test from that process; do not disable sandboxing to bypass it. No real player saves were used or modified by these checks.

## Next agent

1. Follow `AGENTS.md` and the startup process in this folder.
2. Check `codex/entry-town-hud-camp-summary`, its PR and the v0.8.4 release/workflow for delivery state.
3. Read the latest handoff and current feature docs. No further gameplay task is assigned after these eight UI touches.
4. Licensed runtime exports have been staged privately from the installed licensed v0.8.3 app and verified (251 nodes, 20 animations, 39 weapon grips). These ignored files do not travel with Git. Preserve finished-release staging rules.

## Transfer gaps

Purchased Dungeon Mason exports, build outputs, saves, local tools and MCP configuration are not transferred by Git. Use [machine setup](machines.md). This repository process preserves explicit project knowledge, not a guarantee that every chat is available on every device.
