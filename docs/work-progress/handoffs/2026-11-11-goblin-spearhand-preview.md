# 2026-11-11 — Goblin Spearhand private preview

- Machine: bmoser Ubuntu desktop.
- Branch: `codex/modular-owned-assets-pilot`.
- Base: `0f873bd08384a64bfcf18fc2c301d79c18ee0e37`.
- Scope: requested head/skin/outfit/gear/animation preview completed; dungeon integration deliberately not performed.
- Broader pipeline status: WIP, no merge or release.

## Result

New editable closed goblin head with long ears, projecting nose, amber eyes/pupils/brows, teeth/fangs, green neck and bare scalp. Separate brass saucepan helmet/handle follows the head bone and can be hidden. Rust-red source tunic, brown gloves/boots and brass trim. Exact accepted body, spear, skeleton and five source animations retained, including corrected point-first thrust.

Versioned builders: `build-goblin-spearhand-pilot.py`, `review-goblin-spearhand.mjs`; [report](../../goblin-spearhand-owned-pilot.md) contains reproduction, license boundaries, review limitations and provisional semantic score (77, author assessment, not an in-game score update).

Reviewed first draft and corrected hair clipping, faceted head normals, ear inset/winding and bead-like teeth. Consolidated rigid parts into removable head/helmet groups, reducing draw calls. Final output has 29,454 triangles, four mesh groups/14 draw calls, 14 materials, one 512×512 texture, 2.21 MB.

## Validation

- Both builders completed in isolated Blender; source package/fixture unchanged.
- Exact source comparison passes for 43 rest bones/hierarchy, Body08/Spear02 vertices/topology/weights/transforms and all five action channels/keyframes.
- Standard Three.js reviewer passes finite/distinct animated geometry, visible pixels and binding checks. Front, side, rear, three-quarter and five poses inspected.
- New presentation renderer captures equipped and bare-head views plus 254 frames at source speed (30 fps). Inspected thrust, hit and final death frames; no page errors. Final silent H.264 video is 900×900, 8.47 seconds, labeled by phase.
- GLB roundtrip preserves 43 bones, five actions, four skinned groups and one image. Structural preservation only; no whole-frame pixel equivalence claim.
- Python AST and Node syntax checks pass. No gameplay change, native launcher/encounter performance test or Windows check. Facial expression is static; body/hand animation uses the source rig.

## Private artifacts and next gate

Root `~/.local/share/four-lanterns-modular-pilot/2026-11-11/goblin-spearhand` contains `.blend`/GLB, provenance, preservation, validation and roundtrip reports, presentation frames and final `goblin-spearhand-preview.png` / `goblin-spearhand-motion.mp4`. Source fixture is `../spear-thrust/source-spear.blend`; purchased source paths are in the machine record. No model binaries go into public Git.

User requested review before dungeon use. Show candidate and motion now; retain current runtime/installed game. Dungeon lighting/scale, ground/hand clearance and six-creature encounter performance remain the next qualification work after visual review. No roster batch restart and no claim of final high-end art acceptance.

Only intended scripts/docs are committed/pushed on the WIP branch; current.md staged selectively. Prior dirty gameplay changes/untracked creature-batch work remain local and untouched. Verify remote hash before claiming sync. No unfinished pipeline merge.
