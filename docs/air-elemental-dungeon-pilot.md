# Air Elemental native dungeon pilot — November 11, 2026

Status: **opt-in integration and technical test passed; final art approval pending**. The installed menu AppImage remains the approved Goblin Spearhand build. No public release, Debian replacement or roster batch.

## Candidate and presentation

Original procedural geometry from `scripts/toolchain/build-air-elemental-pilot.py`, using no purchased mesh. Version 3 transports the sweep normal between samples to avoid abrupt cross-section flips. The private GLB has 25,736 triangles, nine primitives, four materials, no textures or bones, and roughness 0.3. Three named wind groups are animated by `src/view/air-elemental.mjs`; the standalone GLB does **not** embed skeletal clips. Runtime idle, walk, attack, hit and death use object transforms. Idle/walk rotations now make complete revolutions for seamless looping. Source meshes are shared; per-instance materials/transforms remain independent.

The conditional `FLD_AIR_PILOT=1` route loads the private model only when present. Its attacks show pale curved pressure waves, rather than the generic fire projectile. No creature damage, AI, rules or encounter balance changed.

Author review: smoother seams and a recognizable wind silhouette, but still sculpted ribbons rather than the reference's full rolling cloud volumes. Provisional six-part fit (1–5): anatomy 4, silhouette 3, signature 2, equipment 5 (correctly none), materials 3, distinction 3; weighted 68/100 using 30/15/20/15/10/10. This is an author assessment against the reference, not a user rejection or an assertion of parity with earlier uncalibrated scores. Bruce subsequently called the Air Elemental fantastic and asked to continue the existing workflow; the next task is the Wolf pilot. No further Hunyuan work requested.

## Verification

- Full suite: **360 tests passed**, including new actual-mixer loop closure and instance-isolation checks.
- Blender export/reimport preserved the 25,736 triangles, nine meshes, four materials and WindLower/Middle/Crown groups. Runtime animations were tested in Three.js separately; there is no embedded-animation roundtrip claim.
- Three.js preview: front/side/back plus 249 motion frames across five states, no page errors.
- Native launcher: exact `launch-game.sh` through `aa-exec -p unconfined`, using a user service to preserve the ordinary terminal sandbox context. Space-free staged executable, sandbox enabled, temporary save data and `--mute-audio`.
- Six elementals and four heroes in a generated dungeon room; 20 seconds of real AI turns. Heroes pass turns with boosted HP to keep the fixture alive. A test-only adaptive camera keeps all ten actor bounds inside the usable viewport as gusts push them; walls can still occlude actors. This is presentation/performance evidence, not balance validation.
- **59.50 FPS** average, median 16.7 ms, p95 16.8 ms, p99 16.9 ms, maximum 33.3 ms. Zero intervals above 33.34 ms. RTX 3090 / ANGLE OpenGL, 1600×1000, DPR 1. Six enemies alive and four heroes active throughout. Maximum renderer totals: 470 calls / 541,940 triangles across all render passes, not unique mesh geometry.
- All five animation states observed. A real lethal attack after benchmarking verifies hit, full death playback and eventual hiding. No captured JavaScript errors.
- Eight-second silent dungeon capture recorded after timing, so screenshot/video encoding does not affect the benchmark.

## Reproduce and retrieve

Private source root: `~/.local/share/four-lanterns-modular-pilot/2026-11-11/air-elemental/`. Candidate: `v3/air-elemental.glb`, editable `v3/air-elemental.blend`; preview under `review-v3`; roundtrip reports under `v3/roundtrip`.

GLB SHA-256: `2ad97340eb9d31e476b1b2f04864178c6c1e600d70514cb1be572a1d33cd2a9b`.

Copy the GLB to ignored `public/assets/licensed/creatures/AirElementalSculpted.glb`, then `FLD_AIR_PILOT=1 npm run package:dir`. Run `node scripts/air-elemental-dungeon-check.mjs` in an ordinary terminal or user service (the harness applies AppArmor context itself). Evidence: ignored `test-results/air-elemental-dungeon/{results.json,performance.json,combat.png,death.png,dungeon-motion.mp4}`. Source/scripts travel with Git; these private files do not.

After testing, `npm run package:dir` without the environment flag restores the ordinary checkout build. That restoration completed successfully. No installed game update was made for this pilot.
