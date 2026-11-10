# Current working progress

Updated: 2026-11-09 (America/New_York).

## Baseline

- Product: **Four Lanterns Deep**; repository `bruceamoser/Four-Lanterns-Deep`.
- Latest published release remains **[v0.8.5](https://github.com/bruceamoser/Four-Lanterns-Deep/releases/tag/v0.8.5)**, immutable source/tag `23effe99ae9ae3d4ba82e12d4fadb999e125c8a3`. The fixes below are unreleased source changes; package version remains 0.8.5 until a release preparation change.
- Progression remains the v0.6 Discipline Forge. Follow [implementation status](../implementation-status.md), [adaptations](../computer-game-deltas.md) and [release process](../releases.md).

## Current task — publish v0.8.6

Bruce requested the patch release. Active issue #124, branch `codex/v086-release`, base `2568232`. See [release handoff](handoffs/2026-11-09-v086-release.md). Version preparation and local qualification are in progress; v0.8.5 remains latest until all installer gates pass. The previous Supplies PR #123 is merged and #122 closed.

## Completed implementation — simpler supplies

Bruce approved the direct-restocking + camp-project design. Issue [#122](https://github.com/bruceamoser/Four-Lanterns-Deep/issues/122), branch `codex/122-simple-supplies`, base `b9ee51f` (all four previous player-feedback PRs #118–#121 are merged).

Implemented: a party Supplies overview, reviewed Greyhaven restock to a preferred die, shared carried ingredient stocks, deterministic specialist camp projects with work-order previews and recipient selection, compatible migration preserving old materials' value/Bulk, and advanced-recipe separation. See [feature rules](../supplies.md) and [session handoff](handoffs/2026-11-09-simple-supplies.md).

Implementation and verification are complete in [PR #123](https://github.com/bruceamoser/Four-Lanterns-Deep/pull/123). Author review is recorded; this completion checkpoint precedes the final documentation-head CI and merge gate. The overview and camp layout are compact; later-task shortages use work-order projections. Best capable buying/crafting discounts apply automatically. Maker’s Gift retains its shared once-per-day receipt and requires real ingredients. No new release or system installation requested.

## Verification

- Final gameplay head `fd36d5387e2b009239ead304826659d735afbd97` passes all **331 tests and the build** in both CI runs (42749647417 and 42749653758). Local full suite passed 329 before the final procurement/Maker’s Gift additions; dedicated final restocking suite passes 11 and the final supply/camp/foraging suite passes 30. Only completion documentation changes follow that qualified gameplay head; latest-head CI remains required before merging.
- Rebuilt licensed checkout; actual `launch-game.sh` native checks pass HUD, the new Supplies screen, reviewed/free-cancel/exact-cost restocking, shared ingredients and Bulk, compact 1100×800 bounds, specialist projects and paused camp save/reload, camp medical/resting/animation/order, advanced rope crafting, combined supply preservation, provision movement, character/roster and named/pending-reaction saves. Sandbox, renderer seccomp, terminal AppArmor context and window-close disk save pass.
- Final incremental desktop pass also succeeds for projected shortages and the finished Supplies/camp/advanced-recipe UI, save/reload, sandboxing and window-close saves. See the session handoff for exact logs and resolved fixture failures.
- Historical release qualification remains in [v0.8.5 handoff](handoffs/2026-11-09-v085-release.md). No new installers/publication in this task.

## Local machine and next agent

Checkout `/home/bruce/Projects/Deep-Dark-Dungeons-HoL` has a rebuilt runtime containing these unreleased changes. Bruce's separately installed system package remains 0.8.5 and was not replaced. Real saves and personal running windows were not used for tests or closed. Existing untracked superseded Borin body/layer prototypes remain untouched.

1. Follow `AGENTS.md`, fetch and inspect the active #122 branch/PR before resuming. Preserve unrelated untracked art prototypes.
2. Verify PR #123 final checks/merge and issue #122 closure. Implementation is complete; any future release needs version preparation and finished licensed installer gates. Keep source/release/installed versions distinct.
3. The previous four gameplay fixes are complete; do not reimplement them or restore superseded prototypes.

## Transfer gaps

Purchased Dungeon Mason exports, build outputs, saves, local tools and MCP configuration do not transfer by Git. See [machine setup](machines.md). This process transfers explicit project memory, not every chat or local database.
