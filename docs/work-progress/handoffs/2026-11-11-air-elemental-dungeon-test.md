# 2026-11-11 — Air Elemental dungeon pilot and Hunyuan feasibility

- Machine: bmoser Linux desktop, two 24 GB RTX 3090s; test uses one GPU.
- Task: continue Air Elemental test while Bruce compares Tripo; research his subsequent local Hunyuan question.
- Branch: `codex/modular-owned-assets-pilot`.
- Base checkpoint: `f53c118c855a207b8f0864edc7f938783c59bb7c`.
- Status: technical pilot passed; final art review and broader workflow unfinished; no PR merge/release.

## Completed

Fixed sweep orientation seams and looping wind rotations. Added opt-in roster/appearance routing and pressure-wave attacks. Added `scripts/air-elemental-dungeon-check.mjs` and loop/isolation tests. See [detailed report](../../air-elemental-dungeon-pilot.md). Reviewed Hunyuan official multiview code, model cards, memory requirements and the actual weights license; [research](../../hunyuan-local-feasibility.md) records the output-distribution obstacle. No installation performed.

## Verification

`npm test`: 360 passed. Blender GLB roundtrip preserves geometry, named groups and materials. Three.js preview: 249 frames, five states, zero page errors. Native `launch-game.sh` via `aa-exec -p unconfined` from a user service, muted and temporary saves: six elementals plus four heroes, 59.50 FPS, p95 16.8 ms at 1600×1000, five states and full death playback, zero JS errors. Fixture boosts hero HP, passes hero turns and frames actors with an adaptive test camera; not a balance test. Staged-index Vite build passed (existing chunk-size advisory). Rebuilt normal checkout packaging without the pilot flag after testing. Installed AppImage remains unchanged.

## Remaining

1. Bruce praised the Air Elemental and requested continuing the current workflow. Continue to the Wolf pilot; no further Hunyuan work or new generation batch requested.
2. Resolve Hunyuan license suitability before treating generated output as production art. Any trial should reuse existing split references and compare total cleanup/animation effort.
3. Wolf is the next previously agreed creature test. Do not restart full-roster generation.

## Private/local state

V3 model/source/roundtrip and preview are under `~/.local/share/four-lanterns-modular-pilot/2026-11-11/air-elemental/`; staging/evidence paths and hash in the report. Purchased assets remain private. Existing unrelated local creature routing, native-check, smoke-slinger effects and old batch scripts remain uncommitted intentionally. No private assets or installers included in checkpoint.

## Sync

This checkpoint is intended for the same WIP branch. Verify the remote commit after pushing; repository history identifies its hash. A push does not constitute merge, release or transfer of private media.
