# 2026-11-09 — Simpler supply preparation

- Machine/platform: Bruce's Linux desktop, `/home/bruce/Projects/Deep-Dark-Dungeons-HoL`.
- Task: implement Bruce's approved direct-restock + camp-project design.
- Work branch: `codex/122-simple-supplies`.
- Base: `b9ee51fa2de1684e5aee82e902f15e1ada2d0358`, fetched/verified main before work.
- Issue: #122; PR #123; follow issue → branch → PR → author review/checks → merge.
- Status: implementation/layout complete; final incremental qualification and author review/CI gate in progress. No new release.

## Completed

New `supply-stock.mjs`/`restocking.mjs` provide party overview, exact town quotes, atomic full-party procurement, d4–d20 departure preference, counted shared ingredients with carried Bulk, tiered preparation costs, role-based camp output, automatic worker selection, targeted future duties and compatible migration. `supplies.mjs`/CSS supplies the HUD/inventory/workshop entry, filters, before/after previews, free review cancellation, ingredient purchase and camp handoff. Advanced recipes remain separately accessible. Camp previews simulate actual order and ingredient competition. Camp supply details collapse to keep projects visible; existing order controls remain available.

## Decisions

Read `docs/supplies.md`. Supplies remain individual; depletion/combining, Bulk, camping/resting/medical rules and printed sources remain intact. Legacy counted batches keep zero Bulk; typed material dice convert at remaining expected check value and preserve original Bulk until consumed. Advanced/untagged materials are unchanged. New counted ingredients weigh 0.25 each. Source book/Foundry files are untouched.

## Verification

34 focused restocking/camp/foraging/combined-supply/Bulk tests pass. Initial actual `launch-game.sh` native pass covers inspected caster field actions, Supplies review/cancel/exact cost/Bulk/shared stocks, compact 1100×800 bounds, skilled camp project and paused save/reload, camp medical/resting behavior, advanced rope recipe workflow and combined supplies. Runtime is sandboxed in terminal AppArmor context; no real saves are used.

Full unit suite is running in `/tmp/fld-supplies-unit-final.log`; rebuilt package follows it. Final compact layout/die animation and all affected native checks still need qualification. Logs from the initial native pass: `/tmp/fld-supplies-native.log`. Existing camp/foraging tests were updated for counted ingredients and one-step preparation; full historical supply-die conservation/Bulk checks remain intact.

## Remaining and next steps

1. Inspect full unit results, qualify final rebuilt desktop layout and affected workflows, and fix any real failures.
2. Review complete diff and migrations; update the checkpoint with exact final results.
3. Push the final source/docs, record author review, wait for latest-head CI, merge and verify remote main/issue closure.

## Local-only state / transfer needs

Paid Dungeon Mason runtime exports and rebuilt runtime are ignored. Installed game remains 0.8.5 and is not replaced here. Existing untracked superseded Borin prototypes remain untouched. Personal GitHub identity verified as bruceamoser; use escalated Git/network/native checks in this environment. Never close personal game/Blender/Unity windows or use real saves as fixtures.

## Sync status

Implementation checkpoint `4f62882` and procurement checkpoint `768229f` are verified on remote `codex/122-simple-supplies`. Final source/docs belong to PR #123; verify its final head/main before delivery. Do not merge until final qualification passes.

## Qualification checkpoint

All 329 unit tests pass (`/tmp/fld-supplies-unit-final.log`). Final focused regression after procurement-rate coverage passes 35 tests; it now verifies the best capable buyer/crafting discount automatically applies, and dead heroes cannot supply that bonus. Compacted the stock overview, collapsed camp supply details while preserving work-order controls, added task portraits and a reduced-motion-aware die-growth animation. Full final native regression is running in `/tmp/fld-supplies-native-final.log`. Draft PR #123 tracks this complete feature; no merge before final qualification/review.

## Final review findings

Added direct legacy-ingredient transfer and untagged-material preservation checks. Updated the HUD fixture for the intentionally added Supplies shortcut and renamed herb reports; no gameplay checks were weakened. The affected native suite then passed completely in `/tmp/fld-supplies-native-affected-final.log`, including sandbox and disk saves.

Visual review caught a later camp task displaying no warning despite earlier material spending. It now uses its projected work-order shortage and explains when a successful forage could enable it. New supply creation previews include added Bulk. Reviewed Maker’s Gift: it now preserves required materials only once per day, shares the old receipt with advanced crafting and cannot craft from no inputs. Final dedicated restocking suite passes 11; final supply/camp/foraging suite passes 30. Final incremental native results are in `/tmp/fld-supplies-native-polish-final.log`. Final CI must pass before merge.
