# Current working progress

Updated: 2026-11-10 (America/New_York).

## Active — v0.8.7 release qualification

Equipment [PR146](https://github.com/bruceamoser/Four-Lanterns-Deep/pull/146) is author-reviewed and merged at `db741592f50931557ee6c1304297f3f7e38c5442`; #127 and #144 closed. All nine feedback items are implemented. Full 357-test suite, final 45 focused tests, both CI checks and the complete sandboxed native launcher sweep passed. See [catalogue](../equipment-bonuses.md) and [handoff](handoffs/2026-11-10-equipment-release.md).

Release issue #147; branch `codex/v087-release` from `db741592`. Package and notes are prepared for 0.8.7. Build/installer/updater qualification, release PR review/merge, tag, licensed draft upload, staged verification/publication and public download/live-feed checks remain. Do not claim published until the workflow and public checks pass.

## Completed verification

Final gameplay head passes 344 tests and build. Actual sandboxed native launcher checks cover selection, HUD, routes, camp, 58 creature visuals, challenge, training/save compatibility and area-arrow pointer preview/cancel/use. Handoff records exact scoped runs and resolved QA failures. Author review is not independent review.

## Version and machine state

Latest published version remains [v0.8.6](https://github.com/bruceamoser/Four-Lanterns-Deep/releases/tag/v0.8.6), source/tag `6a844f9ab017314ddc5158c8365d639dfa5dc6ab`. Feedback changes are unreleased main source, package version still0.8.6 until release preparation. Installed Debian version verified0.8.6; not replaced. Checkout `/home/bruce/Projects/Deep-Dark-Dungeons-HoL` runtime is rebuilt with these changes. v0.8.7 publication is explicitly requested; qualification is pending.

Private assets, QA outputs and installed copies do not transfer through Git. Real saves and personal windows were not used or closed. Untracked superseded Borin prototypes remain untouched. Follow AGENTS.md and [machine setup](machines.md); pull main and verify the final completion PR before resuming. Equipment implementation and the requested patch release are pending.
