# Current working progress

Updated: 2026-11-09 (America/New_York).

## Baseline

- Product: **Four Lanterns Deep**; repository `bruceamoser/Four-Lanterns-Deep`.
- Latest published release remains **[v0.8.5](https://github.com/bruceamoser/Four-Lanterns-Deep/releases/tag/v0.8.5)**, immutable source/tag `23effe99ae9ae3d4ba82e12d4fadb999e125c8a3`. The fixes below are unreleased source changes; package version remains 0.8.5 until a release preparation change.
- Progression remains the v0.6 Discipline Forge. Follow [implementation status](../implementation-status.md), [adaptations](../computer-game-deltas.md) and [release process](../releases.md).

## Current task — simpler supplies

Bruce approved the direct-restocking + camp-project design. Issue [#122](https://github.com/bruceamoser/Four-Lanterns-Deep/issues/122), branch `codex/122-simple-supplies`, base `b9ee51f` (all four previous player-feedback PRs #118–#121 are merged).

Implemented: a party Supplies overview, reviewed Greyhaven restock to a preferred die, shared carried ingredient stocks, deterministic specialist camp projects with work-order previews and recipient selection, compatible migration preserving old materials' value/Bulk, and advanced-recipe separation. See [feature rules](../supplies.md) and [session handoff](handoffs/2026-11-09-simple-supplies.md).

Status: verification/polish in progress; do not merge until the final native/unit/CI checks and author review pass. Focused engine/migration tests and initial native Supplies/camp/advanced-recipe/save checks pass. Full unit suite and compact-layout qualification are running. No new release or system installation requested.

## Verification

- Both latest gameplay-head CI jobs pass **320 unit tests** and build: runs `42741730864` and `42741742486`, source checkpoint `9769908`. Local full suite passed 319 before the final starred-water test; final focused AI/care suite passed 34 including it.
- Rebuilt licensed checkout and verified 251 nodes, 20 animations and 39 weapon grips.
- All native Linux regression checks qualified across two passes through actual `launch-game.sh`, terminal AppArmor context, sandbox and renderer seccomp enabled. First pass qualified HUD/music/town/respec/Forge/gear/shortcuts. The old direct-counter fixture then needed legal enemy-turn initialization; after fixing it, reaction-through-end checks all pass, including the new AI, field abilities, hazard/diagonal UI, camp, effects, recovery, all creature visuals, named saves, pending reactions and window-close disk save. Logs and exact commands are in the session handoff.
- No new installers or public release were produced for this batch. Historical v0.8.5 release qualification remains in [its handoff](handoffs/2026-11-09-v085-release.md).

## Local machine and next agent

Checkout `/home/bruce/Projects/Deep-Dark-Dungeons-HoL` has a rebuilt runtime containing these unreleased changes. Bruce's separately installed system package remains 0.8.5 and was not replaced. Real saves and personal running windows were not used for tests or closed. Existing untracked superseded Borin body/layer prototypes remain untouched.

1. Follow `AGENTS.md`, fetch and inspect the active #122 branch/PR before resuming. Preserve unrelated untracked art prototypes.
2. Complete simpler-supplies qualification and review, then merge the passing PR and close #122. Keep source/release/installed versions distinct.
3. The previous four gameplay fixes are complete; do not reimplement them or restore superseded prototypes.

## Transfer gaps

Purchased Dungeon Mason exports, build outputs, saves, local tools and MCP configuration do not transfer by Git. See [machine setup](machines.md). This process transfers explicit project memory, not every chat or local database.
