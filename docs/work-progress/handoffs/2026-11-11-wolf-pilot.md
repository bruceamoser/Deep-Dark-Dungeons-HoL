# 2026-11-11 — Wolf reuse pilot

- Machine: bmoser Linux desktop, RTX 3090.
- Task: continue existing workflow after Bruce praised Air Elemental; next agreed test is Wolf.
- Branch: `codex/modular-owned-assets-pilot`.
- Base checkpoint: `828feb3f698a812455362e14e1a63bce96a1a610` (Air test and Hunyuan research, pushed/verified).
- Status: opt-in Wolf technical pilot complete; visual acceptance pending; no merge/release/install replacement.

## Completed

Reused earlier private multiview wolf/CuMesh mesh and fitted 23-bone rig. Builder refines coat, eye landmarks, snout seam/jaw weights, oral surfaces and teeth; revises five clips. Dedicated runtime adapter preserves the rig/materials and selects the bite clip at closure. No generation or retopology rerun. See [wolf report](../../wolf-pilot.md).

## Verification and failures addressed

The public Quaternius fallback's missing hit clip was identified and explicitly labeled in the comparison. First pilot's sealed mouth/low eyes were corrected before v2 testing. Blender roundtrip preserves 23 bones, 19 skinned meshes, five actions. Three.js comparison: 222 frames, finite poses, no page errors. Full `npm test`: 360 passed. Staged-index Vite build passed (existing chunk-size advisory); normal checkout packaging was restored successfully without the pilot flag.

Native exact launcher via AppArmor unconfined/user service, muted audio, temporary saves, sandbox enabled. Six wolves/four heroes: final clean run 59.90 FPS, p95 16.8 ms, max 33.3 ms at 1600×1000, 44 turn transitions, all five states/full death and zero JS errors. First harness stalled on grapple retained-actions; second advanced but direct endTurn calls leaked expected choice exceptions. Final driver chooses categories and clicks the actual UI, passing without suppressing errors. Hero HP is boosted; death test clears conditions/restores one action after measurement only. This is not balance evidence.

## Next

Review the wolf comparison/dungeon motion with Bruce. Remaining coarse fur, mouth corners and gait/ground contact are documented; don't call it finished high-end art. Both Air and Wolf are opt-in previews; installed Spearhand build remains unchanged. No Hunyuan work or batch restart. Choose promotion/refinement from review, not technical checks alone.

## Private transfer / local work

Candidate/source/media: `~/.local/share/four-lanterns-modular-pilot/2026-11-11/wolf/`; original source under prior `meeple-roster-2026-11-11/wolf`. Full hash/paths in report. Ignored game staging and native captures do not travel through Git. Preserve unrelated dirty creature routing, effects, native-check and historical batch files; they are excluded from this checkpoint.

## Sync

Push this bounded checkpoint to the existing WIP branch and verify the remote hash; repository history identifies the final commit. No PR merge or public release.
