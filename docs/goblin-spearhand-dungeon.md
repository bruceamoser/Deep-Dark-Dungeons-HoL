# Goblin Spearhand — six-creature dungeon qualification

**Promotion update — November 11:** Bruce approved this model for the game. The exact reviewed export is now pinned in `config/approved-creature-assets.json` and enabled by default when installed; no pilot environment flag is needed. The historical qualification notes below remain the evidence and limitations. Current production follows [the sequential queue](creature-production/README.md).

November 11, 2026. Bruce approved the [owned-source preview](goblin-spearhand-owned-pilot.md) and requested an encounter with six Spearhands and four heroes. This completes that bounded pilot; the rest of the creature pipeline remains paused.

## Runtime integration

The approved private GLB is staged at `public/assets/licensed/creatures/GoblinSpearhand.glb`, SHA-256 `0774c4ca0b2c844e7160363ce2cbe620d89d158aaa987c7d11ada18197d1c099`. Vite enables its dedicated roster entry only when this file exists. A checkout without the purchased asset keeps the existing OrcRaider fallback. The `GoblinSpear` equipment asset remains separate.

The dedicated appearance factory preserves the source skeleton and five embedded clips, clones instance materials and applies a fixed 0.9 scale (approximately 1.25 units tall including the pot). It adds no duplicate spear, helmet, costume or animation library. Authored roughness survives loading. The spear attack uses the actual point-first source motion despite its legacy `1H_Melee_Attack_Slice_Diagonal` slot name; contact is at 8/30 seconds, with no sword arc. Approaches finish before queued strikes; lethal hits show the hit reaction and full falling animation before hiding the corpse.

Per creature: 29,454 triangles, 14 rendered material primitives, 43 bones, one embedded 512×512 palette texture. Six copies contribute 176,724 model triangles before shadow/additional rendering passes. Source geometry, weights, animations and GLB bytes are unchanged from the approved preview.

## Actual native test

`scripts/goblin-spearhand-dungeon-check.mjs` launches the ordinary `launch-game.sh` through `aa-exec -p unconfined`, with `--mute-audio` and temporary saves. On this host, run through a normal user systemd service: the agent shell's inherited NoNewPrivs would otherwise invalidate a SUID sandbox test.

```sh
npm run package:dir
systemd-run --user --collect --unit=fld-spearhand-review \
  --working-directory="$PWD" /usr/bin/node scripts/goblin-spearhand-dungeon-check.mjs
journalctl --user -u fld-spearhand-review --no-pager
```

The fixture opens a chamber in an actual generated dungeon, uses six Spearhand stat cards and the four starting Dungeon Mason heroes, then starts normal combat AI. Heroes have **500 fixture HP and pass turns** to sustain the sample; these changes affect temporary test saves only. This measures presentation/performance, not encounter balance. A hero then walks into range and kills one Spearhand through the real attack handler to exercise hit/death sequencing.

After shader/scene warmup, the final launcher run sampled 20 seconds at a 1600×1000 viewport and drawing buffer, DPR 1, using ANGLE/OpenGL on one NVIDIA RTX 3090:

| Measurement | Result |
| --- | ---: |
| Frames / average FPS | 1,195 / **59.75** |
| Median / p95 / p99 frame time | 16.7 / 16.8 / 16.9 ms |
| Maximum frame time | 33.4 ms |
| Frames over 33.34 ms | 3 |
| Minimum visible actor groups | 10 |
| Living enemies throughout sample | 6 |
| Peak draw calls across render passes | 514 |
| Peak triangles across render passes | 562,220 |

Renderer counters include the dungeon, heroes, shadow and postprocessing passes; they are not the mesh's unique triangle count. The earlier same-build narrower camera sample also averaged 59.95 FPS, but only the final wider-camera run is the qualification result. This is a short, refresh-capped Linux test, not a universal FPS guarantee or a dual-GPU benchmark.

All six Spearhands entered walking and thrust states (6–7 attacks each over the complete test including the later capture). All five clips were exercised; the final check also waits for death to reach its full duration, clamp, then disappear. No JavaScript errors. Reviewed initial composition, live fight frames, hit/death capture and the silent source-speed dungeon video: face/colors and pot silhouette remain legible; gear stays attached; no obvious exploding deformation or detached hands in the inspected views. The existing source locomotion is not foot-IK corrected, and this is author review, not exhaustive per-frame animation certification.

The native main process was `unconfined`, executable path had no spaces, renderer Seccomp was 2, audio was muted and no `--no-sandbox` flag was present. Personal saves and audio preferences were untouched. Initial harness retries corrected an outdated accessible-button selector, UI reaction-dialog handling, the hero's melee approach and Electron's flattened `/proc` argument representation; these were test harness failures, not model fixes.

`npm test`: **358/358 pass**. Linux directory, AppImage and Debian builds pass. A build of the staged Git index, excluding unrelated local pipeline edits, also passes. Windows runtime, lower-end GPUs and a long dungeon soak were not tested.

## Local delivery and evidence

The normal per-user menu AppImage is updated with this local review build, retaining version label 0.8.7. The prior image/menu are backed up in `~/.local/share/four-lanterns-install-backups/2026-11-11-spearhand/`. The system Debian installation and public GitHub release are unchanged; a new local `.deb` is in `release/`.

Launcher evidence: ignored `test-results/goblin-spearhand-dungeon/` contains `results.json`, `performance.json`, `dungeon-six.png`, `combat.png`, `death.png`, and `dungeon-motion.mp4`. Video is captured **after** benchmarking to avoid recording overhead in frame times. Installed-menu verification also passed with the same six/four fixture, all five states, no JS errors and sandbox checks: **59.80 FPS**, p95 **16.8 ms**, one frame over 33.34 ms (maximum 33.4 ms). Its evidence is separate in `test-results/goblin-spearhand-installed/`.

The purchased input and generated asset remain private; transfer them separately between machines. Git contains the integration, reproducible harness and progress records. No asset batch was restarted and no new paid tools or generation were used.

## Player review revision — image reconstruction

The new Spearhand is reconstructed from its own neutral reference with the battered pan helmet, red kerchief, wraps and bare feet. TRELLIS.2 and CuMesh supplied the anatomy and surface, and the owned Spear02 was fitted to the new hand. The point advances 0.385 model units in the thrust, peaking at frame 13. The spear settles horizontally on collapse. Removed six inspected microscopic triangles. The 74,900-triangle export passes GLB reimport, quarter-frame head clearance, floor checks, 474 rendered motion frames, and muted development bestiary/dungeon checks. The earlier performance table refers to the previous model. Final private candidate is `goblin-spearhand/image-rebuild/rigged-final/`.
