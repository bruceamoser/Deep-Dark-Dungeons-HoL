# 2026-11-09 — Welcome, Greyhaven HUD and camp reports

- Work branch: `codex/entry-town-hud-camp-summary`.
- Base: `fdcf0b2` (handoff process PR #102).
- Working version: 0.8.4. Consult PR/release state for merged/published status.

## Work

Implemented all eight requested touches: persistent preload/entry gate; illustrated destination menu; actual equipped hero portraits; centered clock; settings gear in town/dungeon; Tab map; J journal; actual camp results. S is Smithy, Shift+S is Shrine because the requested list duplicated S. Shared UI test helpers handle the new entry step and settings menu, including older published apps for updater tests.

Camp reports record initial/final health, wounds, materials, supply state and all activity messages. Hourly healing totals are separate from net HP. Completed and early-ended reports persist in the existing save envelope and are validated; old saves without reports still load. Town sleep has a transient recovery summary.

## Verification and delivery

271 automated tests pass. Dedicated HUD browser/native checks cover entry keyboard input, settings, icons/portraits, navigation, Tab/J across renders and reopening camp results. Branding checks cover 1600/1100 layouts and reduced motion. Full native, finished Linux/Windows installers, update round trip and CI must pass before publication; inspect PR checks and release workflow for final evidence.

Audio's gain interpolation needs polling rather than an immediate full-gain assertion. Town camera tests must choose an actual uncovered canvas point rather than a location that may overlap a building pin. No real player saves are used.

## Private/machine state

Four verified Dungeon Mason runtime files were extracted privately from the locally installed licensed v0.8.3 app into ignored `public/assets/licensed/`. Purchased source remains private. Local launcher tests run through the user systemd manager to avoid the agent's NoNewPrivs restriction, then use aa-exec unconfined and retain sandboxing.

## Qualification follow-up

The native passes also cover the complete creator/reserves/Hall, combat/camera, supplies/crafting and the recall loop. The Depths retains its return-floor badge after recall. Dedicated final HUD and remaining creature/save checks are used after updating old menu assertions. A real 0.8.3 → 0.8.4 update passed all checksum/save/restart gates. Source-only Windows CI exposed a startup timeout; the diagnostic now waits explicitly up to 90 seconds and reports initialization failures. Installer publication remains gated on passing source/finished builds.

## Next / sync

Finish qualification and release if any gate is outstanding; otherwise await Bruce's next task. This checkpoint is pushed on its named branch; verify the remote/PR before treating it as synced. See `current.md` and repository history for the exact checkpoint.
