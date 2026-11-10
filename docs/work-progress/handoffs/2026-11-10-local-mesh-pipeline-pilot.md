# 2026-11-10 — Local mesh pipeline pilot

- Machine: bmoser Ubuntu, dual RTX3090; generation used GPU0 only.
- Branch: `codex/local-mesh-pipeline-pilot`.
- Base: `de652e6f5d1231e6efb915f5e0010f60a316f012` (main after wave05).
- Status: bounded experiment complete; production adoption fails motion/topology gate.

## Completed

Installed isolated Modly0.4.3, TRELLIS2-GGUF extension and pinned weights; local raw and textured Crypt Ghoul GLBs generated from untouched pinned portrait. Four-angle Blender renders inspected and raw/textured fronts shown to Bruce, who welcomed the result. Mesh2Motion installed, private Vite env serialization corrected, browser boot verified. Exploratory static reduction, fitted28-bone skin and five embedded clips exported; real Three.js idle/walk/punch/hit/death previews tested. Severe stretching and topology loss are explicit failures, not accepted art. See [report](../../local-mesh-pipeline-pilot.md) and [portable pins/hashes](../../audits/2026-11-10-local-mesh-pilot.json).

## Decisions and next work

Keep production Crypt Ghoul/current installed game. Successful detailed source is worth further work. Prepare a neutral riggable pose, selectively rebuild body/joint/hair/cloth topology, bake detail and textures, refit/clean weights and retest five clips. Establish the runtime animation contract and complete dependency/license chain before integration/public asset redistribution. No candidate fit score yet. No source book/Foundry changes, game changes or release.

## Verification

Modly API health, native cumesh/flex_gemm imports and real image→GLB→texture succeeded. Blender imported/rendered raw/textured sources four directions. Mesh2Motion boot has no page errors; generated real rig/clip GLB reloaded and animated in Three.js. The latter is a failed visual-quality gate, despite valid export. No gameplay/native launch/Windows rerun for this docs-only repository checkpoint. No DeepSeek worker used on this installation experiment.

## Local-only state

`~/.local/share/four-lanterns-pipeline-pilot/2026-11-10`: tools/venvs/models/workspace/input/output and machine-specific exploratory scripts. `output/textured-preview/front.png` is the successful candidate; `output/m2m-walk-test.gif` records failed deformation of the untextured proxy. Installation logs are `/tmp/fld-pipeline-*`. Installed source/weights remain for next session; no personal Blender scene or system audio settings touched. Quiet browser rendering used `--mute-audio`.

## Sync

Documentation/pins checkpoint on the named branch; use Git history/PR for final commit and merge status. Private artifacts, environments and model weights require separate transfer. No public game release or installer update.
