# Wolf pilot — November 11, 2026

**Promotion update — November 11:** Bruce approved this model for the game. The exact reviewed export is now pinned in `config/approved-creature-assets.json` and enabled by default when installed; no pilot environment flag is needed. The historical qualification notes below remain the evidence and limitations. Current production follows [the sequential queue](creature-production/README.md).

Bruce approved continuing the existing workflow after the Air Elemental test. No Hunyuan installation, paid generation or roster batch was started. This is a bounded wolf candidate for review, not a new installed release.

## Source and changes

The current public Quaternius wolf is a 2,740-triangle blocky canine with nine bones and no dedicated hit animation. Its CC0 source/hash is already recorded in `creature-assets.json`. Inspection used idle as an explicitly labeled placeholder for its missing hit state; that is not a claim of a source hit animation.

The pilot reuses the existing private **multiview wolf body, CuMesh reduction and fitted quadruped rig** under `~/.local/share/four-lanterns-pipeline-pilot/2026-11-10/meeple-roster-2026-11-11/wolf/animated-candidate.blend`. It is the unequipped animal from the earlier stylized turnaround, not a rerun of the rejected batch. Original files remain untouched. Generated reference/derived source redistribution remains unresolved; keep exports private rather than treating them as part of Quaternius's CC0 license.

`prepare-wolf-pilot.py` makes an editable copy with:

- Slate/ivory vertex-painted coat replacing hard horizontal texture bands, roughness 0.3, distinct amber eyes and black nose.
- Fitted eye geometry and highlights; the first revision's eyes were too low and were refitted to the sculpt surface.
- A local snout seam split, revised jaw weights, dark oral surfaces and upper/lower teeth. The first preview confirmed the sealed original mouth stretched instead of opening; v2 visibly opens and closes.
- Revised idle, walk, bite, hit and side-fall death clips. Ground support is corrected at authored walk/death keys.

Candidate: **118,007 triangles, 19 skinned meshes, 23 bones, six materials, no image textures**, 6,833,532 bytes. No new generation, blanket welding, decimation or full rerig. Private hash: `b28b9b256a6147099bd3d8d7397194ef2a5f005114869f5f5651e140399e129f`.

## Visual review and limitations

Front, side, back, bite-open, death and 222 actual Three.js motion frames reviewed. The new model has a readable wolf silhouette and much better coat/jaw detail than the cube-like public fallback. The comparison labels the fallback's missing hit clip. All five pilot clips produce finite skinning; no page errors.

Provisional author fit: anatomy 4, silhouette 4, signature 4, equipment 5 (correctly none), materials 4, distinction 3, weighted **81/100**. User approval remains pending. This rating is identity fit, not a declaration of finished high-end art. Remaining polish: fur ridges are coarse, gait is not yet distance-matched to every movement speed, and intermediate death samples penetrate the ground by up to about 1.1 cm at game scale. Mouth corners and toe contact need player review in motion. No other wolf variants were replaced.

## Validation and reproduction

Blender roundtrip preserved 23 bones, 19 skinned meshes, five named actions and no image textures. Runtime preview verifies the actual GLB's clips separately. `npm test`: 360 passed. Staged-index Vite build passed; normal checkout packaging restored successfully after the native test.

The opt-in `FLD_WOLF_PILOT=1` build uses a dedicated factory to preserve authored colors, clone the rig/materials per actor, normalize height to 1.05, keep full death playback and select `Bite_Front` at jaw closure. Other creatures and gameplay rules are unchanged.

Native test: `scripts/wolf-pilot-dungeon-check.mjs`, exact launcher via `aa-exec -p unconfined` under a user service, sandbox enabled, mute audio and temporary saves. Six normal-stat wolves plus four heroes in a generated room; boosted hero HP and passed hero turns sustain the fixture. The first run stalled on the grapple retained-actions modal; the harness now chooses retained categories and clicks the actual End turn UI. Benchmark requires advancing turns, attack effects and ten in-frame actors. Finishing-blow setup clears the test hero's conditions/restores one action only after timing. Results are presentation/performance evidence, not balance testing. The final clean run passed: **59.90 FPS average**, p95 16.8 ms, p99 16.9 ms, maximum 33.3 ms at 1600×1000/DPR 1 on RTX 3090. Forty-four turn transitions, attacks during 1,168 sampled frames, all ten actors in frame, six wolves alive and four heroes active. Maximum 576 renderer calls / 1,639,244 triangles across all passes. All five animation states, full death playback, zero JavaScript errors. Silent video was captured after benchmarking.

Private working root: `~/.local/share/four-lanterns-modular-pilot/2026-11-11/wolf/`; accepted-for-testing candidate under `v2/`, comparison under `review-v2/`. Ignored staging: `public/assets/licensed/creatures/WolfPilot.glb`; native evidence under `test-results/wolf-pilot-dungeon/`. Git carries scripts and reports, not these private assets/videos.

Rebuild with `FLD_WOLF_PILOT=1 npm run package:dir`; execute the native harness in an ordinary terminal or user service. Rebuild without the flag to restore normal checkout behavior. The installed menu AppImage has not been replaced by this preview.
