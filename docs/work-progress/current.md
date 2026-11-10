# Current working progress

Updated: 2026-11-09 (America/New_York).

## Active feedback investigation

Issue #127, active implementation branch `codex/128-turn-selection`. Nine feedback requests are tracked. First turn-selection fix has nine focused tests passing; native qualification/PR review remains. See [feedback handoff](handoffs/2026-11-09-player-feedback.md). Accepted: ingredient-free probabilistic basic camp tasks, automatic recipients with override; level2/depth4, level3/depth7, level4/depth11 without reducing earned levels, independent of difficulty. Equipment discussion deferred. Continue independent combat/HUD/route and asset investigation.

## Delivered

Four Lanterns Deep **v0.8.6** is published as latest: https://github.com/bruceamoser/Four-Lanterns-Deep/releases/tag/v0.8.6
Immutable source/tag `6a844f9ab017314ddc5158c8365d639dfa5dc6ab`, release PR #125. Supplies PR #123 and player-feedback PRs #118–#121 are merged. No remaining implementation work.

331 tests pass; complete sandboxed native launcher regression passes. Finished licensed AppImage, installed Debian and Windows NSIS checks all pass in staged run 42753469276, which published the release. See [release handoff](handoffs/2026-11-09-v086-release.md), [supply rules](../supplies.md) and [release process](../releases.md). All ten public SHA-256 entries and both updater SHA-512 manifests pass; published 0.8.5 discovers/downloads 0.8.6 through its live feed. Author review is not independent review.

## Local state and transfer

Checkout `/home/bruce/Projects/Deep-Dark-Dungeons-HoL` is rebuilt at 0.8.6. The separately installed user game was not replaced; update through Settings → Updates or the published installer. Real saves and personal windows were untouched. Existing untracked Borin prototypes remain untouched.

Private Dungeon Mason exports and local build/test outputs do not transfer through Git. Follow [machines](machines.md), [decisions](decisions.md) and AGENTS.md. Verify the release and final delivery PR on GitHub when switching machines; do not repeat completed features.
