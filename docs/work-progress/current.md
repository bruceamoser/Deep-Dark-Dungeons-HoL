# Current working progress

Updated: 2026-11-10 (America/New_York).

## Active — v0.8.7 staged publication

All nine feedback items are implemented. Equipment PR146 is merged at `db741592`; release PR148 is author-reviewed and merged at `f7da756a951abaff5c5261f257e755765ad027f3`. Immutable tag `v0.8.7` points there. #127/#144 are closed; release #147 remains open until publication/public checks finish. See [catalogue](../equipment-bonuses.md) and [handoff](handoffs/2026-11-10-equipment-release.md).

Full 357-test suite, final 45 focused tests, complete sandboxed native launcher sweep, both source installer platforms, final licensed AppImage smoke check, isolated Linux bundle installer and real 0.8.6→0.8.7 update safety/restart pass. Finished licensed apps are staged privately in `release/staged-0.8.7`. Draft upload/publication workflow and public asset/hash/manifest/live-feed checks are pending. Documentation checkpoint branch: `codex/v087-publication-record`.

## Completed verification

Final gameplay head passes 344 tests and build. Actual sandboxed native launcher checks cover selection, HUD, routes, camp, 58 creature visuals, challenge, training/save compatibility and area-arrow pointer preview/cancel/use. Handoff records exact scoped runs and resolved QA failures. Author review is not independent review.

## Version and machine state

Latest public release remains v0.8.6 until staged publication succeeds; source/package/tag are prepared at v0.8.7. Installed Debian remains0.8.6 and was not replaced. Use `release/qa-tmp` for TMPDIR on this machine: /tmp is almost full. Initial Debian packaging failed there; the main-disk retry succeeded.

Private assets, QA outputs and installed copies do not transfer through Git. Real saves/personal windows and untracked Borin prototypes remain untouched. Final publication/public verification and synced completion records are the only remaining work.
