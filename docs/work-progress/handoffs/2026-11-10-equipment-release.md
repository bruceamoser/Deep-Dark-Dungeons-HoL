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

## Equipment merged; release preparation

PR146 author-reviewed and merged at db741592f50931557ee6c1304297f3f7e38c5442. Final documentation head 780b53b passed both CI runs 42770222495/42770227408. The complete native launcher suite passed (release/equipment-native-full.log), including all prior feedback features and equipment, run slots and native-close save, with terminal AppArmor and renderer sandbox/seccomp retained. Screenshot of the equipment inspector was inspected. #127 and #144 are closed.

Release issue #147; codex/v087-release from db741592. Version/lockfile and release notes prepared for 0.8.7. Finished licensed builds and release qualification in progress. Installed Debian remains 0.8.6, unchanged.

## v0.8.7 qualified and tagged

Release PR148 author-reviewed/merged at f7da756a951abaff5c5261f257e755765ad027f3; immutable tag v0.8.7 matches it. Rules/build CI passed both checks; source installer run42770607896 passed both Linux and Windows. Finished licensed Linux AppImage/Debian and Windows portable apps built locally; both ASARs report0.8.7 with Dungeon Mason present. Licensed export verification passed251 nodes/20 animations/39 grips.

Final AppImage smoke check passed with licensed models, sandbox/terminal AppArmor, gameplay, music, save IPC and supported update controls: release/v087-appimage.log. Real published0.8.6→0.8.7 round trip passed checksum rejection, failed-save installation guard, verified replacement/restart and journey/vault preservation: release/v087-roundtrip.log. Full native gameplay source sweep had already passed unchanged source. Initial Debian packaging failed in full /tmp; retry with TMPDIR=$PWD/release/qa-tmp succeeded (release/v087-linux-retry.log). Windows/checkout builds: release/v087-windows.log and v087-dir.log.

Eight finalized initial assets in ignored release/staged-0.8.7 have valid SHA256SUMS; Linux metadata sizes/SHA512 match. Isolated Linux installer and friendly menu entry pass (release/v087-bundle-install.log); no system install performed. Draft upload is in progress; staged publication then public download/hashes/manifests/live feed remain pending. Do not overwrite published installers; corrections need a new version. Source-only CI builds must never replace the licensed apps.
