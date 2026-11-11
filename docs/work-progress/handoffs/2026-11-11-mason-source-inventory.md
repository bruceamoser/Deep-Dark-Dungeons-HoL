# 2026-11-11 — Full Dungeon Mason inventory and source rig test

- Machine: bmoser Ubuntu desktop.
- Branch: `codex/modular-owned-assets-pilot`.
- Base for this session: `2444dab4592e9e06602f0554501580d792242790`.
- Status: WIP source test; no production creature replacement, merge or release.

## Completed

Bruce downloaded/imported the purchased package. Located actual import under `~/Setup Guide In-Editor Tutorial/Assets/RPGTinyHeroWavePolyart`; verified all 1,024 asset files against the cached archive. Made private source copies. Original archive SHA-256 matches the earlier purchase record. Exact inventory and limitations are in [owned-assets report](../../owned-assets-pilot.md).

Confirmed 598 animation FBXs including variants, 179 geometry FBXs, 197 prefabs and eight example scenes. Existing game export includes all supplied head-part names and standalone weapon designs; bow/arrow containers already go through its exporter. No hidden additional creature meshes in URP/HDRP ZIPs. Twenty bodies, three cloaks, 43 source bones including root. Additional source animations are the principal unused resource.

Added `prepare-mason-spear-pilot.py`: private authored human Body08/head/hair/face/Spear02 assembly, five original spear clips, rest/hierarchy guards, original palette and roughness 0.3. No generated-head reuse in this test and no new goblin claimed. Full source rig match, rendered export and sample motion verified.

## Validation

- CLI self-update check: 1.0.0-beta.17 current.
- `unity assets inspect`: 1,072 entries including folders, 1,024 asset files.
- Byte comparisons: zero missing or changed imported files.
- Blender isolated source import: 20 bodies/three cloaks; all five spear clips have matching 43-bone names/hierarchy/rest matrices (maximum delta ~7e-18).
- Builder clean exit and Python AST parse pass.
- Standard `review_asset_submission.mjs ... 0.85 embedded`: finite distinct geometry, visible pixels, no animation-binding failures across five states; 5,354 triangles, seven draw calls, one texture/material, ~1.43 MB GLB.
- Inspected front/side/back/three-quarter, pose sheet and attack/death motion samples. Captured 120 frames and silent MP4, slowed for pose review. Ground/weapon clearance and full grip quality remain unaccepted. No native encounter FPS or Windows check; no production promotion.

The first private extraction was interrupted because repeated gzip seeks were slow. A corrected sequential gzip/tar pass used the CLI's canonical path inventory; removed only malformed duplicate filenames produced by that interrupted task-owned extraction. Final source bytes match the complete imported package. Original purchases were untouched.

## Unity state

Added Pipeline 1.0.0-pre.1 only to AssetReview, but its Editor had not refreshed and loaded the server. The user's actual import was in the tutorial project. Did not edit that project or use another Editor as an automation fallback. Blender and archive inspection are independent. Bruce asked whether Unity/Hub can close: yes; reopen the correct project for future live Editor work.

## Next work

Use authored sources for one coherent equipped creature: choose head/body adaptations, clean colours, role-specific weapon pose, and review all clips at game scale. The rejected generated head needs substantial cleanup; do not promote it based on the source rig test. Keep roster batch stopped until a representative creature passes. No new purchase required for this test.

## Private state and synchronization

See machine record for import/source/asset-cache paths. Private review root `~/.local/share/four-lanterns-modular-pilot/2026-11-11/mason-source-review`; motion preview `source-spear-motion.mp4`. Reproduce static review using commands in the report. The extended 120-frame capture harness is local under ignored `test-results/owned-source-motion/capture.mjs`.

Only intended builder/docs are checkpointed. Previous dirty gameplay edits and untracked creature batch files remain local. Push this WIP branch and verify remote HEAD; no unfinished PR merge. Git does not carry purchased source, private exports, Unity installation/account or images/video.
