# Equipment and patch release — November 10, 2026

## Objective and authorization

Bruce approved the complete item-type catalogue and strongest-matching stacking, then explicitly requested finishing, committing/pushing, updating progress documentation, author review/merge and a new release. See docs/equipment-bonuses.md for durable approved categories and chosen conservative values. #144 is the implementation; #127 is its parent.

## Current checkpoint

Branch codex/144-equipment-bonuses, base f66704142b97bf613046ebf61e1c8fb4f31a8ec4. Implementation and QA in progress; not yet merged or released. New magic receipts are revision 3; legacy receipts preserve identities and names while reconstructing approved effects. Added form pools, stacking, weapon scoping, discipline roll competence, defensive/condition/terrain bonuses, carrying/storage, optional kits and toggleable magical light. Source rules/Foundry remain untouched.

## Validation so far

32 focused existing loot/build integration tests pass after updating obsolete-effect expectations. 13 new catalogue/stacking/combat/weight/light/save tests pass. Initial new-test failures were fixture mistakes: a nonexistent intersection name and an arena light radius above the save validator's limit. Both corrected without weakening validators. The full rules suite passed 357/357. The actual sandboxed native launcher equipment check passed descriptions, equip/remove, live light toggles and inactive stowed effects, plus native-close disk save; screenshot inspected. Final small integration/QA edits pass 45 focused tests; final full native sweep and release qualification remain pending.

## Next

Finish author review, full tests and sandboxed native equipment interaction. Update exact evidence here, open PR for #144, review/check/merge. Then prepare v0.8.7 on a separate release branch and follow docs/releases.md: licensed local builds, installer/update qualification, version PR, reviewed tag, draft upload and Verify/publish staged release workflow. Do not publish source-only fallback builds.

Installed Debian remains 0.8.6; no personal saves/windows touched. Existing untracked Borin prototypes remain untouched. Licensed exports/builds/QA profiles stay ignored and need private transfer. Use release/qa-tmp for TMPDIR because /tmp is nearly full. Git/network/native checks need approved escalated execution on this desktop.
