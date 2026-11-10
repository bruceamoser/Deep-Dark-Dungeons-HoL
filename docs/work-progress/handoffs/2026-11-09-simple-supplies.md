# 2026-11-09 — Simpler supply preparation

- Machine/platform: Bruce's Linux desktop, `/home/bruce/Projects/Deep-Dark-Dungeons-HoL`.
- Task: implement Bruce's approved direct-restock + camp-project design.
- Work branch: `codex/122-simple-supplies`.
- Base: `b9ee51fa2de1684e5aee82e902f15e1ada2d0358`, fetched/verified main before work.
- Issue: [#122](https://github.com/bruceamoser/Four-Lanterns-Deep/issues/122); PR [#123](https://github.com/bruceamoser/Four-Lanterns-Deep/pull/123).
- Status: implementation, visual/native verification and author review complete. This documentation checkpoint precedes its latest-head CI/merge gate. Verify PR merge and issue closure on GitHub before resuming; no feature work remains. No new release.

## Completed

New `supply-stock.mjs`/`restocking.mjs` provide party overview, exact town quotes, atomic full-party procurement, d4–d20 departure preference, counted shared ingredients with carried Bulk, tiered preparation costs, role-based camp output, automatic worker selection, targeted future duties and compatible migration. `supplies.mjs`/CSS supplies the HUD/inventory/workshop entry, filters, before/after previews, free review cancellation, ingredient purchase and camp handoff. Advanced recipes remain separately accessible. Camp previews simulate actual order and ingredient competition. Camp supply details collapse to keep projects visible; existing order controls remain available.

## Decisions

Read [feature rules](../../supplies.md). Supplies remain individual; depletion/combining, Bulk, camping/resting/medical rules and printed sources remain intact. Legacy counted batches keep zero Bulk; typed material dice convert at remaining expected check value and preserve original Bulk until consumed. Advanced/untagged materials are unchanged. New counted ingredients weigh 0.25 each. Source book/Foundry files are untouched.

Best capable buying/crafting discounts apply automatically. Maker’s Gift preserves required materials once per day, shares the existing advanced-crafting receipt and cannot produce supplies without the required inputs. New supply creation previews include added Bulk. Later camp tasks show their projected ingredient shortage after earlier tasks spend materials; successful foraging is described as conditional.

## Verification

- Final gameplay commit `fd36d5387e2b009239ead304826659d735afbd97` passes **331 tests, zero failures, and build** in both CI runs [42749647417](https://github.com/bruceamoser/Four-Lanterns-Deep/actions/runs/42749647417) and [42749653758](https://github.com/bruceamoser/Four-Lanterns-Deep/actions/runs/42749653758). Completion documentation is the only subsequent change; require latest-head CI before merging.
- Local full suite passed 329 tests before the final procurement/daily-gift additions (`/tmp/fld-supplies-unit-final.log`). Final dedicated restocking suite passes 11 (`/tmp/fld-supplies-restocking-final.log`); final supply/camp/foraging suite passes 30 (`/tmp/fld-supplies-gift-review.log`). Legacy transfer, untagged-material preservation, dead-source exclusion, discounts, daily receipt and missing-input cases are covered. Historical supply-die conservation/Bulk checks remain intact.
- Rebuilt licensed runtime with `npm run package:dir`. Actual `launch-game.sh` affected native suite passes HUD, Supplies review/cancel/exact cost/shared-stock Bulk, compact 1100×800 bounds, specialist project and paused save/reload, camp medical/resting/order/animation, advanced rope crafting, combined supplies, provision movement, field abilities, character/roster, named saves and pending-reaction saves (`/tmp/fld-supplies-native-affected-final.log`).
- Final incremental native pass after review corrections succeeds for Supplies, projected later-task shortages, camp preparation, paused save/reload and advanced crafting (`/tmp/fld-supplies-native-polish-final.log`). Exact launcher, terminal AppArmor context, renderer seccomp, sandboxing and window-close disk saving pass. No injected `--no-sandbox` and no real saves.
- Inspected screenshots at compact and full-size layouts: `test-results/supplies-1100.png`, `supplies-town.png`, `supplies-review.png` and `supplies-camp-project.png`. No overflow. Reduced-motion styling is present.

## Resolved failures and review

An initial broad native attempt expected one HUD utility button; Supplies intentionally adds a second. Updated the fixture to check both Settings and Supplies explicitly. The first affected attempt then expected the old herb report name; updated it for medicinal herbs. Both affected and final incremental suites passed afterward. These are separate qualified runs, not a claim that every historical native check ran in one clean full-suite invocation.

Visual review found a later camp project missing a shortage warning despite earlier spending. Corrected the projected warning and added native coverage. Reviewed transactional town quotes, higher dice and Bulk preservation, shared material ownership, migration idempotence, transfer/drop/recovery, caps/costs, worker/tool/knowledge limits, paused work orders and Maker’s Gift. Author review is recorded on PR #123; it is not independent review.

## Sync and next steps

Implementation checkpoints `4f62882`, `768229f` and final gameplay head `fd36d53` are verified on remote `codex/122-simple-supplies`. This completion documentation belongs to PR #123. Finish latest-head CI, merge with the expected head SHA, fast-forward local main and verify issue #122 closed. Subsequent agents should inspect the PR's actual merge status/SHA rather than reimplementing completed work.

No release/install was requested. A future release needs version preparation and the complete licensed installer gates; source package version remains 0.8.5 until then.

## Local-only state / transfer needs

Paid Dungeon Mason runtime exports and rebuilt runtime are ignored and need private transfer. The checkout runtime includes these unreleased source changes; the separately installed game remains 0.8.5 and was not replaced. Existing untracked superseded Borin prototypes remain untouched. Personal GitHub identity verified as `bruceamoser`; use approved escalated Git/network/native checks in this environment. Never close personal game/Blender/Unity windows or use real saves as fixtures.
