# Current working progress

Updated: 2026-11-10 (America/New_York).

## Latest work — complete visual-fit survey

Bruce requested an honest scored comparison of current creatures to source descriptions and illustrations. [The full audit](../audits/2026-11-10-creature-fit.md), JSON and CSV cover all 58 runtime entries, with six explicit criteria, per-entry rationale, source/asset provenance and reproducible side-by-side captures. Source baseline `a56aacc`; 134 other source creatures are outside the runtime roster. Mean 44.8/100: 5 strong, 9 usable, 12 approximate, 14 weak, 18 failing. Scores are editorial judgments, not measured similarity percentages.

Important findings: Golem key is visibly a floating winged creature, not a stone/clay humanoid; kobolds/hybrids/elementals and corpse proxies need appropriate bodies; several roles lack their stated equipment and humanoid theme geometry is bypassed. Bat body is invisible in both neutral capture and focused actual-game browser scene here; packaged/native reproduction is still needed. Earlier casting claims are explicitly superseded. No gameplay/assets changed and no new release made. See [audit handoff](handoffs/2026-11-10-creature-visual-fit-audit.md).

Next: discuss/prioritize corrections with Bruce; no implementation is underway. Local source is 0.8.7, but this machine’s checkout launcher is still 0.8.5 and installed game 0.8.4. Other-machine runtime/installed-version claims below do not describe this machine.

## Complete — v0.8.7 published

All nine player-feedback items, including the approved equipment catalogue, are implemented, author-reviewed and merged. Equipment PR 146 closed #127/#144. Release PR 148 merged at `f7da756a951abaff5c5261f257e755765ad027f3`; immutable tag `v0.8.7` points there. [v0.8.7 is public/latest](https://github.com/bruceamoser/Four-Lanterns-Deep/releases/tag/v0.8.7), with eleven finished licensed release assets. Publication run [42772691226](https://github.com/bruceamoser/Four-Lanterns-Deep/actions/runs/42772691226) passed AppImage, installed Debian, installed Windows NSIS and publication.

See [delivery handoff](handoffs/2026-11-10-equipment-release.md), [equipment catalogue](../equipment-bonuses.md) and [release notes](../release-notes.md). Final documentation PR 149 closes release #147 after verification. No gameplay WIP remains. Resume from main; preserve the untracked superseded Borin prototypes.

## Verified

357 rules tests, final focused equipment tests, complete exact-launcher native suite, both source installer platforms, finished licensed AppImage checks and isolated Linux bundle installer passed. Real 0.8.6→0.8.7 replacement/restart preserved the journey and vault, rejected corrupt downloads and blocked installation on save failure. All public download checksums and both updater manifests verify. An unmodified published 0.8.6 client discovered and downloaded public 0.8.7 through its existing feed. Review was author review, not independent review.

## Machine and private state

Installed Debian was verified 0.8.6 and left unchanged; use Settings → Updates to install 0.8.7. Checkout runtime/builds are 0.8.7. Real saves and personal windows were untouched. Purchased exports, installers and QA outputs stay ignored and do not transfer through Git.

Use `TMPDIR="$PWD/release/qa-tmp"` for builds and QA on this desktop because /tmp is almost full. The first Debian packaging attempt failed there; the main-disk retry succeeded. Follow [machine setup](machines.md) and AGENTS.md before resuming on another computer.
