# November 10 — Player feedback implementation complete

Base for this delivery record: `2b05fff474fa7cde29c81db0d830363e6fcbd156`. Completed source work follows issue → codex branch → PR → author review/checks → merge. Author review is not independent review.

## Merged

- #128 / PR129: selecting a hero is free; turn starts on action/movement commitment. Conditions are not advanced by inspection.
- #130 / PR137: current Speed and physical DR beside Grit on party cards.
- #131 / PR138: actual route preview, damaging squares and actionable opportunity threats; existing consent remains.
- #132 / PR139: ingredient-free probabilistic basic camp duties, automatic/manual recipients, finished supply foraging. Advanced crafting and dressing-based care/once-daily wounds remain.
- #133 / PR140: full owned KayKit/Mason inventory audit, closer creature casting, scale/tint improvements. Exact kobold/wererat/werebear meshes absent from owned packs; optional 30-monster Polyart bundle researched, not bought/imported. See creature-casting.md.
- #134 / PR141: per-journey challenge settings for future floors/wanderers; printed stats/XP awards unchanged.
- #135 / PR142: slower nonlinear XP, level2/3/4 around depths4/7/11, curve3 migration preserves earned levels and fractional progress across party/reserve/fallen. No training/healing on migration. Includes untyped enemy fallback tint guard found during desktop checks.
- #136 / PR143: early Barbed Volley and Flaming/Thorn Arrow areas, same saved IDs and Forge connections, normal bow/ammo/action costs and ally safety.

## Verification

Final gameplay head `ace43e3b833f78b0f2822401eed2ab31c20118ee` passed 344 tests/build in CI runs 42764432215 and 42764437707 before merge. Full local suite passed 338 before six final arrow tests; six arrow-specific tests pass separately. Per-issue desktop qualifications exercised actual `launch-game.sh` with terminal AppArmor, renderer seccomp and sandboxing, isolated profiles and native close saves. Relevant logs:

- /tmp/fld-128-native.log and fld-128-saves.log: pointer selection, combat controls/counters and fresh-profile saves.
- /tmp/fld-130-polish-native.log: all four Speed/DR values and inspected layout.
- /tmp/fld-131-native.log: hovered route/risk text, free preview/cancel and confirmed movement.
- /tmp/fld-132-native.log and fld-132-final-native.log: camp/Supplies/medical/advanced recipe UI and pause/reload.
- /tmp/fld-133-final-native.log: all 58 creature adapters and 17 conditions; all eight gallery groups inspected.
- /tmp/fld-134-native.log: challenge controls, current enemy preservation and reload.
- /tmp/fld-135-native.log, fld-135-native-final.log, fld-135-final-ui.log and fld-135-controls.log: separate successful respec, Forge, roster and control checks after QA fixes described below.
- /tmp/fld-136-native-complete.log: arrow pointer preview/cancel/cast, final ammo, ally safety, notice acknowledgement and close saves.

These are scoped runs, not one claimed full native sweep. Resolved QA issues: old fixed XP awards/number formatting updated for the new curve; one combined subset lacked enemies and saves were qualified fresh; skeletons correctly resisted Bleeding so condition tests use bandits; arrow cleanup now acknowledges exhausted supplies without opening the run library. No assertion or gameplay guard was removed to pass checks.

## Remaining discussion

Parent #127 remains open only for equipment discussion #144. Bruce wants to go item type by item type and hear available bonuses first. Start with weapons, then armour, shields and accessories. Equipment bonuses remain unchanged; do not implement a new list without his decisions. Explain current `critical` as extra damage on Strong hits, `ambush` as hidden-attack damage and `impact` as wall-collision damage. Separate current generated loot bonuses from proposed additions such as accuracy Boons/range/armour penetration.

## Versions and local-only state

Latest public release remains v0.8.6; this feedback work is merged, unreleased source. Installed Debian version verified 0.8.6 and left untouched. Checkout runtime deliberately rebuilt with feedback changes. No new tag, installer publication or system replacement requested in this batch. Real saves/personal windows and existing untracked Borin prototypes untouched. Purchased exports, builds, QA temporary data and screenshots are ignored and do not transfer through Git. Use main after verifying final delivery PR merge; no gameplay WIP remains.
