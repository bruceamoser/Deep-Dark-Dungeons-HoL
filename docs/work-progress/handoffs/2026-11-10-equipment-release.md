# v0.8.7 delivery — November 10, 2026

## Completed objective

Bruce approved the item-by-item equipment catalogue and strongest matching bonuses, then explicitly requested completion, commit/push, progress records, author review/merge and a new patch release. All nine feedback items are merged and v0.8.7 is public/latest. Source rules, Foundry, purchased source assets and real player saves were not changed.

- Equipment PR 146: `db741592f50931557ee6c1304297f3f7e38c5442`; closes #127/#144.
- Release PR 148 and immutable v0.8.7 tag: `f7da756a951abaff5c5261f257e755765ad027f3`.
- Finished installer verification/publication: [run 42772691226](https://github.com/bruceamoser/Four-Lanterns-Deep/actions/runs/42772691226), all three platforms and publish passed.
- [Public release](https://github.com/bruceamoser/Four-Lanterns-Deep/releases/tag/v0.8.7): eleven assets, stable/latest, not a draft or prerelease.
- Final documentation PR 149 records delivery and closes release issue #147. Author review is not independent review.

## Implemented equipment decisions

[Equipment bonuses](../../equipment-bonuses.md) records the complete approved catalogue, chosen conservative values, stacking, scope and legacy mapping. New receipts use revision 3. Older receipts keep names, identity, version, ownership and equipment state while reconstructing legal readable effects. Strongest matching bonuses apply; normal armour and Shield Block still combine within the existing resistance cap. Weapons have accuracy, damage, Strong/hidden damage, range and plain Push 1; no armour penetration or activated magical-ability affixes. Discipline competence improves all matching ability rolls without granting abilities. Light reduces own Bulk; approved forms can provide toggleable equipped fuel-free illumination. Belts include Fortitude. Cloaks, enchanted packs and optional kits have real slots and effects.

The eight earlier feedback items remain documented in the [previous completion handoff](2026-11-10-feedback-completion.md), supplies, creature casting, challenge, progression and area-arrow feature docs. Its old equipment-discussion/no-release status is superseded by this delivery.

## Verification evidence

- Full rules suite: 357/357. Final 45 focused loot/equipment checks passed after small integration changes. Equipment documentation head `780b53b` passed both CI runs 42770222495/42770227408. Release head `caa2d03` passed both rules/build checks and source installer run 42770607896 on Linux and Windows.
- Full actual `launch-game.sh` suite passed all gameplay/UI modules, 58 creature visuals, 17 condition layers, run slots and native-close save. Normal terminal AppArmor, renderer seccomp and sandboxing were retained. Log: `release/equipment-native-full.log`. Equipment inspector screenshot was inspected.
- Licensed exports verify 251 nodes, 20 animations and 39 grips. Local Linux and Windows ASARs report 0.8.7 and contain Dungeon Mason. Platform builds were sequential. Source-only CI fallbacks were never used as published licensed apps.
- Final licensed AppImage checks passed appearance, weapon forms, supplies, town, camp, music, creature AI, Forge, disk-save IPC and supported updates: `release/v087-appimage.log`.
- Actual published 0.8.6→0.8.7 update rejected corrupt checksums, retained retry, blocked installation on save failure, then replaced/restarted successfully with compatible journey and vault preserved: `release/v087-roundtrip.log`.
- Finalized initial assets in `release/staged-0.8.7` passed SHA256SUMS; Linux metadata sizes/SHA512 match. Isolated bundle installation and friendly desktop entry passed: `release/v087-bundle-install.log`.
- All eleven public assets were downloaded to `release/published-0.8.7`; all ten checksum entries and both Linux/Windows updater manifests verify. An unmodified published 0.8.6 client discovered/downloaded 0.8.7 with no feed override: `release/v087-live-feed.log`.

Resolved QA failures: the two initial new-test failures were fixture errors (nonexistent intersection name and oversized arena light radius); validators remained intact. Initial Debian packaging failed in the almost-full /tmp tmpfs. Rebuilding with TMPDIR on the main disk succeeded (`release/v087-linux-retry.log`). Other build logs: `release/v087-windows.log`, `release/v087-dir.log`. No published binary was replaced in place.

## Resume and machine boundaries

Use main after final documentation PR 149 merges. No feature/release work remains pending. Installed Debian was verified 0.8.6 and deliberately left unchanged; update through Settings → Updates. Checkout runtime/builds are 0.8.7. No personal game/Blender/Unity window or real save was used or closed. The unrelated untracked Borin prototypes remain untouched.

Purchased exports, installer archives, test profiles and screenshots stay private/ignored and need separate transfer. Use `TMPDIR="$PWD/release/qa-tmp"` on this desktop; /tmp is nearly full. Personal GitHub identity is bruceamoser without switching global authentication. Git/network/native operations require this environment's approved escalated execution. Follow AGENTS.md and machine setup before resuming elsewhere.
