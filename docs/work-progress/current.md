# Current working progress

Updated: 2026-11-10 (America/New_York).

## Active — equipment implementation and v0.8.7 release

Bruce approved the complete equipment catalogue and strongest-matching stacking, and requested finishing, commit/push, updated docs, review/merge and a new patch release. Work is on `codex/144-equipment-bonuses` from `f667041`. See [equipment catalogue](../equipment-bonuses.md) and [current handoff](handoffs/2026-11-10-equipment-release.md). Implementing/qualifying #144 closes the remaining work in #127. Do not restart the design discussion.

## Completed verification

Final gameplay head passes 344 tests and build. Actual sandboxed native launcher checks cover selection, HUD, routes, camp, 58 creature visuals, challenge, training/save compatibility and area-arrow pointer preview/cancel/use. Handoff records exact scoped runs and resolved QA failures. Author review is not independent review.

## Version and machine state

Latest published version remains [v0.8.6](https://github.com/bruceamoser/Four-Lanterns-Deep/releases/tag/v0.8.6), source/tag `6a844f9ab017314ddc5158c8365d639dfa5dc6ab`. Feedback changes are unreleased main source, package version still0.8.6 until release preparation. Installed Debian version verified0.8.6; not replaced. Checkout `/home/bruce/Projects/Deep-Dark-Dungeons-HoL` runtime is rebuilt with these changes. v0.8.7 publication is explicitly requested; qualification is pending.

Private assets, QA outputs and installed copies do not transfer through Git. Real saves and personal windows were not used or closed. Untracked superseded Borin prototypes remain untouched. Follow AGENTS.md and [machine setup](machines.md); pull main and verify the final completion PR before resuming. Equipment implementation and the requested patch release are pending.
