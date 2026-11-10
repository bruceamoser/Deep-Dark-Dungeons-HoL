# Current working progress

Updated: 2026-11-09 (America/New_York).

## Baseline

- Product: **Four Lanterns Deep**; repository `bruceamoser/Four-Lanterns-Deep`.
- Latest published release remains **[v0.8.5](https://github.com/bruceamoser/Four-Lanterns-Deep/releases/tag/v0.8.5)**, immutable source/tag `23effe99ae9ae3d4ba82e12d4fadb999e125c8a3`. The fixes below are unreleased source changes; package version remains 0.8.5 until a release preparation change.
- Progression remains the v0.6 Discipline Forge. Follow [implementation status](../implementation-status.md), [adaptations](../computer-game-deltas.md) and [release process](../releases.md).

## Latest completed implementation

Bruce's four player-feedback reports are handled through issues #114–#117 and PRs:

- [#118](https://github.com/bruceamoser/Four-Lanterns-Deep/pull/118): inspected-hero field actions, validated town/dungeon companion picker and actual Forge descriptions. Merged at `1a0ea6e`.
- [#119](https://github.com/bruceamoser/Four-Lanterns-Deep/pull/119): confirmation before harmful routes, all party followers, interaction approaches, movement powers/swaps/landings and new-hazard pauses. Merged at `21e8945`.
- [#120](https://github.com/bruceamoser/Four-Lanterns-Deep/pull/120): one-point diagonals beside a single occupied side square; solid corners, occupied destinations and two blocked sides remain blocked. Merged at `6eb0f66`.
- [#121](https://github.com/bruceamoser/Four-Lanterns-Deep/pull/121): hazard escape and budgeted safer creature routes, water for removable Burning, paid self/adjacent-ally condition care and constrained printed support. This completion checkpoint accompanies that PR; inspect GitHub for its final merge SHA rather than treating the branch SHA as main.

Printed statistics, CV and encounter budgets are unchanged. Current 58 encounter cards have no allied HP-healing ability; no unprinted healing spell was added. See [creature AI](../creature-ai.md) and [session handoff](handoffs/2026-11-09-player-feedback-fixes.md).

## Verification

- Both latest gameplay-head CI jobs pass **320 unit tests** and build: runs `42741730864` and `42741742486`, source checkpoint `9769908`. Local full suite passed 319 before the final starred-water test; final focused AI/care suite passed 34 including it.
- Rebuilt licensed checkout and verified 251 nodes, 20 animations and 39 weapon grips.
- All native Linux regression checks qualified across two passes through actual `launch-game.sh`, terminal AppArmor context, sandbox and renderer seccomp enabled. First pass qualified HUD/music/town/respec/Forge/gear/shortcuts. The old direct-counter fixture then needed legal enemy-turn initialization; after fixing it, reaction-through-end checks all pass, including the new AI, field abilities, hazard/diagonal UI, camp, effects, recovery, all creature visuals, named saves, pending reactions and window-close disk save. Logs and exact commands are in the session handoff.
- No new installers or public release were produced for this batch. Historical v0.8.5 release qualification remains in [its handoff](handoffs/2026-11-09-v085-release.md).

## Local machine and next agent

Checkout `/home/bruce/Projects/Deep-Dark-Dungeons-HoL` has a rebuilt runtime containing these unreleased changes. Bruce's separately installed system package remains 0.8.5 and was not replaced. Real saves and personal running windows were not used for tests or closed. Existing untracked superseded Borin body/layer prototypes remain untouched.

1. Follow `AGENTS.md`, fetch and inspect status/worktrees before resuming. Verify final PR #121 merge and the remote checkpoint.
2. No implementation work remains for these four reports. Keep source/release/installed versions distinct; any next release must follow `docs/releases.md`, version preparation and finished licensed installer gates.
3. Use player feedback for balance against the new AI; do not inflate printed stats or restore superseded body/clothing prototypes.

## Transfer gaps

Purchased Dungeon Mason exports, build outputs, saves, local tools and MCP configuration do not transfer by Git. See [machine setup](machines.md). This process transfers explicit project memory, not every chat or local database.
