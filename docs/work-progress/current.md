# Current working progress

Updated: 2026-11-10 (America/New_York).

## Active — equipment bonus discussion

Eight player-feedback implementation items are reviewed and merged: PR129, PR137–PR143. Parent #127 remains open for equipment design #144. Bruce wants to proceed item type by item type, hearing available bonuses first. Begin with weapons, then armour, shields and accessories. No equipment-affix changes agreed or implemented yet. See [completion handoff](handoffs/2026-11-10-feedback-completion.md), [decisions](decisions.md), [camp supplies](../supplies.md), [creature audit](../creature-casting.md), [challenge](../challenge.md), [progression](../progression.md) and [area arrows](../area-arrows.md).

## Completed verification

Final gameplay head passes 344 tests and build. Actual sandboxed native launcher checks cover selection, HUD, routes, camp, 58 creature visuals, challenge, training/save compatibility and area-arrow pointer preview/cancel/use. Handoff records exact scoped runs and resolved QA failures. Author review is not independent review.

## Version and machine state

Latest published version remains [v0.8.6](https://github.com/bruceamoser/Four-Lanterns-Deep/releases/tag/v0.8.6), source/tag `6a844f9ab017314ddc5158c8365d639dfa5dc6ab`. Feedback changes are unreleased main source, package version still0.8.6 until release preparation. Installed Debian version verified0.8.6; not replaced. Checkout `/home/bruce/Projects/Deep-Dark-Dungeons-HoL` runtime is rebuilt with these changes. No new release requested in this batch.

Private assets, QA outputs and installed copies do not transfer through Git. Real saves and personal windows were not used or closed. Untracked superseded Borin prototypes remain untouched. Follow AGENTS.md and [machine setup](machines.md); pull main and verify the final completion PR before resuming. Equipment discussion is the only remaining original feedback task.
