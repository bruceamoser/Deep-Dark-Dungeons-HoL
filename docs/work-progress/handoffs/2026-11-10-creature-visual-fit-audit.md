# November 10 — Creature visual-fit audit

Bruce requested an honest rating system and complete current-bestiary assessment against descriptions and images. Branch `codex/creature-visual-fit-audit`, base `a56aacc824a0376774c08c4d435247731c73826b`. This machine: `/home/bmoser/Documents/ChatGPT/HoL Procedural Game`.

## Delivered

- `docs/audits/2026-11-10-creature-fit.md`: scope, rubric, limitations, summary, all 58 creature scores/reasons and correction priorities.
- JSON/CSV: six components, final score, reference/asset provenance and evidence filenames. Ratings are editorial, not automatic visual similarity measurements.
- `scripts/creature-fit-capture.mjs`: isolated, read-only front/rear renders using current creature appearance code and original book art; offline sortable comparison HTML and eight contact sheets under ignored `test-results/creature-fit-audit/`.
- Older casting document explicitly corrected/superseded. No game/asset changes, purchases, new release or installed-package replacement.

## Findings

Mean 44.8/100; 5 strong, 9 usable, 12 approximate, 14 weak, 18 failing. Runtime is 58/192 source entries, using 23 GLB and 2 procedural bases; the 134 unimplemented entries are outside this fit average. Biggest mistakes: Golem key is a floating winged creature, human lumberjack used for rat hybrid/corpses, same orc bodies across poorly distinguished goblin/hobgoblin roles, missing role equipment, wind/fire creatures represented by ghost/imp bodies. Humanoid theme geometry is not called by the current renderer, so metadata promises do not establish visible details.

The bat is invisible in neutral capture and a focused actual-game browser scene despite visible entity/mesh bounds. This is an observed failure here, not a cross-platform claim or diagnosed root cause. Packaged/native confirmation still needed. No credit awarded from filename.

## Verification / limits

All 58 descriptions/illustrations and both neutral views were inspected. Actual-game browser gallery completed all 58 adapters and 17 condition layers in isolated Chromium/SwiftShader; all eight neutral comparison sheets visually inspected, plus the relevant actual-game gallery/focused bat screenshot. Capture script checks exact rating coverage/components/totals, runs successfully and emits offline HTML/images. HTML sort controls and image counts checked. No real saves used. Full attack/locomotion animation, native 0.8.7 installers and all lighting/camera states were not requalified. Earlier bat-capture synchronization/culling hypotheses were checked; blank body persists in actual game. Do not interpret structural render-test success as visual identity acceptance.

Logs: `/tmp/fld-creature-fit-capture-final.log`, `/tmp/fld-creature-audit-game.log`, `/tmp/fld-bat-audit.log`. Audit images/HTML are local ignored outputs and must be regenerated after transfer; model/source hashes and ratings travel in Git. No purchased assets or duplicated source illustration binaries committed.

## Resume

Present the survey to Bruce; prioritize rendering/wrong-body failures and role-equipment assembly before cosmetic refinements. This audit does not authorize buying assets or silently replace gameplay. Confirm owned geometry before assuming an asset filename describes its shape. Re-render and explicitly re-score changed entries; rerendering alone does not update fixed ratings.

This machine's launcher still contains 0.8.5 and installed package 0.8.4; source is now 0.8.7. Other-machine handoff runtime versions are not portable facts. Licensed exports remain staged privately here. No build required just to read the audit.
