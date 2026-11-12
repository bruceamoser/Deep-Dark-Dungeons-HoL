---
name: fld-game-assets
description: Prepare or adapt Four Lanterns Deep creature models with Blender, validate GLB exports, and compare them with the pinned bestiary. Use for this game's asset-production work, not unrelated Blender scenes or gameplay rules.
---

Read `docs/asset-production-pipeline.md` from the repository root for the current toolchain, model routing, validation commands and source/licensing boundaries. Use the creature-fit audit as the baseline; a filename, successful import or vertex count does not prove a creature matches.

Work in a task-owned scene and make editable copies of inputs. Keep original rigs, licensed sources and book/Foundry files untouched. Keep purchased/generated working exports private unless their actual license permits source redistribution. Credentials belong in the local helper, never prompts, scene custom properties, logs or Git.

Inspect before changing. The asset inspector reports geometry, transforms, skinning and animation metadata without repair. Do not globally weld, delete hidden geometry, recalculate every normal, decimate or apply transforms. Pick operations for the actual mesh: preserve seams, open clothing surfaces, morphs, detachable equipment, joint loops and bind matrices. Hidden in one pose is not safely removable in all supported poses/outfits.

Use Blender for organic mesh/rig work and SolidCraft for hard-surface parts when useful. Existing rigs and animations are preferable to unnecessary rerigging. Geometry Nodes can build suitable elemental/construct forms. A cloud generator is optional; do not assume a paid account or spend authorization. Meshy's integration is deliberately deferred.

Use TextureCraft for creature surfaces that need visible grain, wear, woven cloth or mottled paint. Start with a suitable library material, then edit its relief, palette and masks for the creature. Exaggerate the size and color contrast of important features and check that they read from the dungeon camera. Follow the TextureCraft workflow in `docs/asset-production-pipeline.md` and bring only the finished maps back onto the rigged Blender asset.

GPT handles planning/integration and judges screenshots/deformation; an explicitly requested DeepSeek worker can inspect inventories, produce bounded scripts or validate reports. Use the separate DeepSeek Codex profile, not a changed global default. Give each worker a bounded input/output contract and permitted operations; verify its output. Model tier alone does not establish spatial accuracy. Do not autonomously fan out model calls merely because this skill is available.

Before accepting an asset, inspect front/side/back and actual gameplay scale, then idle, walk, attack, hit and death. Check feet, grips, joint deformation, textures, alpha, light response and identity without a nameplate. Export GLB and reimport; verify skeleton/clip/material preservation and a real Three.js render. Count exported triangles, draw calls/materials, texture memory and skinning cost; a face target or normalized weights is not acceptance. Record the revised six-part fit rating and remaining gaps. Keep status honest: modeled, rigged, animated, rendered, integrated and approved are separate milestones.
