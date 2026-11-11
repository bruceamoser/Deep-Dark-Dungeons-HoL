# November 11 — Firestarter and reusable adapted gear

## Outcome

Seven of 58 creatures source-integrated and locally installed; 51 remain. Firestarter uses owned Body05/AC03_NerdGlass/BackPack02, approved goblin head and KayKit Dungeon corked bottles. Soot-brown/ember-orange/brass palette. Six clips: idle, walk, two-arm toss, separate melee punch, hit and full death. 29,368 triangles, 43 bones. Private source/GLB/media: `~/.local/share/four-lanterns-creature-production/goblin-firestarter/`. Exact approved bytes pinned in manifest; purchased derivatives are not in Git.

Actual game runtime sends the held bottle mesh on a tumbling arc, hides the hand copy at .46s and restores it during recovery/other poses. Bestiary uses the same equipped asset and visibility adapter. Source-only GLB preview does not contain the runtime release logic. Distinguish this from the actual game throw capture (`game-view/throw-frames`). No changes to damage/burning rules or AI decisions.

## New durable instruction

Bruce: modified existing items must become reusable assets for other creatures. `docs/creature-production/adapted-asset-library.md` is now mandatory input to each brief and output before integration. It registers source/license, recipe, private editable object, fit/palette and review status. Seeded with Scrapper cap, Soldier helmet/shield and Firestarter goggles/flasks/pack palette. Reuse still requires fit and motion checks on another wearer.

## Verification and limitations

368 tests pass. Full turnarounds/source-motion review, six original clips, GLB reimport (zero degenerates/unweighted vertices), Three.js finite checks, all five bestiary states, six Firestarters/four heroes visual scene and fixed-time flask-flight capture passed. AppImage and deb built with required private assets. Primary exact launcher and installed menu image passed native full bestiary/save/close/sandbox checks under aa-exec unconfined. Audio muted; personal saves/settings untouched. Performance remains deferred until the roster is complete. No Windows runtime/public release/system deb install.

Author fit 86/100; clean chibi workwear, mitten fingers, two-arm toss and unlit carried corked bottle are explicit adaptations/limits. No new user-specific approval claimed. Source grip fix: appended head dependencies carried an older Idle action, so fit code must select the current NLA track's action, never an ambiguous global action name.

Native package copying initially tried to follow the primary checkout's chrome-sandbox symlink and was denied. System helper was unchanged. Preserve the launcher's root-owned system-helper symlink; never copy through it. Both final native checks passed. Prior installed AppImage/menu backup at `~/.local/share/four-lanterns-install-backups/2026-11-11-firestarter/`.

## Git and resume

Worktree `/home/bmoser/Projects/FLD-Creature-Production`, branch `codex/sequential-creature-wave02`. Wave01 PR162 merged as `815ffbe17527846017c188ed4cc6b3fcda412f70` after author review and passing local tests/build/native checks. Hosted checks were still queued, with no reported result; do not call them passed or claim independent review. Wave02 was initially based on fd0cbd7 and rebased onto the merged main before first push.

Next creature: **Grave Cultist**. No active/background batch. Read queue, owned inventory and adapted library, inspect hood/cloak/book/candle candidates before modeling. Continue one creature at a time; model/motion/game-view gates remain mandatory. Preserve primary checkout's unrelated dirty historical files. Only private exports/release outputs were copied there; Git source work stays in the clean worktree.
