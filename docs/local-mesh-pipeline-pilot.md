# Local generated-mesh pilot — Crypt Ghoul

Status: bounded pilot complete; generation succeeds, initial motion/optimization gate fails. Isolated from production. Existing wave-05 Crypt Ghoul remains the accepted in-game asset (fit 78/100). A generated shape is not a rigged or game-ready replacement.

## Experiment

Use the pinned book portrait as input to Modly/TRELLIS.2, inspect the generated shape, texture it, fit and skin with Mesh2Motion, then inspect deformation and export in Blender/Three.js. Compare the result with the accepted model. Preserve the original source, game assets, personal Blender scenes and saves.

Working files on this machine: `/home/bmoser/.local/share/four-lanterns-pipeline-pilot/2026-11-10`. Tools, environments, weights and private generated assets are outside Git. The reference is a hunched illustration with long fingers and a ground base, rather than a neutral rigging pose; evaluate fused geometry and fitting errors explicitly.

## Installed and pinned

- Modly v0.4.3: `f11a4d2bd9fe994b9d30f76a36cb6c18ac8733ea`; local FastAPI backend at 127.0.0.1:8765.
- TRELLIS.2 GGUF extension 1.0.9: `db287c0c37241c354bb4addf2ca5f53ba0d866f3`; separate Python 3.11 environment, torch 2.6.0/CUDA 12.6. Native cumesh/flex_gemm imports verified.
- Aero-Ex/Trellis2-GGUF weights: `edf81aef93af0823ac8721da3c9cd3c52d539f87`, Q5_K_M, geometry/texture nodes downloaded (about 10.4 GB). Additional rembg model downloaded during first preprocessing.
- Mesh2Motion: `fd9fdeb2ba214d210e8e4f28015c2a3c06cd8f5b`; npm dependencies installed; local app boots without page errors at 127.0.0.1:8787/create.html. Private Vite override disables automatic browser opening and replaces upstream wholesale environment serialization with an empty object. Only a pilot engine handle is exposed for local automation.
- AssetFurnace inspected as fallback; not installed or executed.

Geometry experiment: seed 42, 1024 cascade, Q5_K_M, 25 sparse/shape steps, remesh resolution 512; one RTX 3090 selected. No paid services or cloud inference. Two GPUs do not imply pooled VRAM.

## Redistribution boundaries

Code and model licenses are separate. Microsoft TRELLIS.2 is MIT, while DINOv3, native rasterization dependencies, quantized redistribution and animation sources require their own attribution/terms review. The quantized repository has no model card. Keep raw candidates private until the complete chain is checked; installation success is not commercial redistribution clearance. Mesh2Motion code is MIT; verify the particular rig/clip license rather than assuming sample models share it.

## Result

Geometry and texture generation both completed through the local Modly API on one RTX 3090. Blender imported and rendered the actual GLBs from four directions. User saw both actual raw and textured renders and welcomed the visual improvement. Compared with the accepted model, facial anatomy, long claws, asymmetrical hunch and ragged clothing follow the illustration substantially better. The generated texture is browner than the illustration; hair and cloth contain very thin fragile geometry. No paid inference was used.

| Artifact | Size | Result |
| --- | ---: | --- |
| Raw geometry | 72,934,656 bytes | About 4.06 million triangles; useful source mesh, unsuitable runtime mesh. |
| Textured source | 126,115,748 bytes | Actual 2048 texture pass, four-angle Blender renders; still high-poly. |
| Static rigging proxy | 4,587,100 bytes | Exploratory reduction to 55,212 triangles; excessive loss/fragmentation in hair, cloth and body. Rejected as final topology. |
| Mesh2Motion experimental export | 8,677,576 bytes | 28 bones, 54,597 triangles and five embedded clips; actual Three.js playback exposes severe stretching. Rejected for production. |

The proxy was deliberately separate and untextured. It is **not** the textured candidate shown to the user. Initial M2M humanoid template does not align with the generated model's centered coordinates, size, facing and hunched rest pose. Corrected size/facing and approximate joint placement produced a bound GLB with Idle_A, Crouch_Walk, Punch_Jab, Hit_Chest and Death_A clips. Local real Three.js rendering of those clips exposes bad joint/cloth deformation; exporting weights and clips does not establish usable animation. Capture paths and artifact SHA-256 are in the local output manifest; portable hashes/pins are in [the pilot record](audits/2026-11-10-local-mesh-pilot.json).

The first proxy reduction is insufficient: dense hair and cloth compete with body/joint detail, and a uniform collapse does not produce deformation topology. Do not ship it or repeat the same reduction across the roster. Preserve the successful source, prepare a neutral riggable reference/rest pose, separate or selectively rebuild fragile hair/cloth, allocate topology to face/hands/joints, bake textures/detail to the optimized mesh, then refit and clean weights. Inspect all five animations again and establish the game's skeleton/clip contract before integration.

No new candidate fit score is assigned: the existing 78 remains the runtime baseline. No production replacement, release, or installed-game update has been made. Game behavior/native launch/Windows were not retested because the pilot changes no game code/assets.

## Local evidence

Under the working directory's `output/`: `raw-preview/`, `textured-preview/` and `current-preview/` contain four-angle Blender renders; `m2m-bind.png`, `m2m-pose-0.png` through `m2m-pose-4.png` and `m2m-walk-test.gif` record the rejected motion test. Raw preview filename `back.png` is the actual face view; facing labels were corrected for the subsequent textured renders. The initial low-poly baseline preview was generated before matching light power was reduced, so compare form, not exposure. The current game/bestiary remains the baseline for real gameplay review.

The private working root also contains `render_candidate.py`, `make-rig-proxy.py`, `fit-m2m.mjs`, `render-motion.mjs`, `download_weights.py`, model download plan and provenance. They are exploratory, machine-specific job files, not a portable production toolchain; transfer separately if needed. A clean installation needs the tool sources, environments and model files again. No credentials were copied into these files.

