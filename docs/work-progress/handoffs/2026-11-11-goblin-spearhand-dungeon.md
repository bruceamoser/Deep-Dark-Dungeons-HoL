# 2026-11-11 — Goblin Spearhand in the dungeon

- Machine: bmoser Ubuntu / RTX 3090.
- Task: integrate approved Spearhand; test six creatures and four heroes.
- Branch: `codex/modular-owned-assets-pilot`.
- Base checkpoint: `b17e176c8d15e3a2cc1d128fe417d1927467fbdc`.
- Status: this bounded integration/test complete; broader pipeline WIP, no public release/merge.

## Completed

Conditional licensed model route, dedicated appearance cloning source rig/materials/clips, fixed goblin scale and no duplicate gear. Point-first thrust uses spear impact at frame 9 rather than a sword effect. Adopted the existing local authored-material/full-death/approach-queue scene changes needed by this route. Unrelated roster/combat effects/generic creature changes remain unstaged.

Portable native harness `scripts/goblin-spearhand-dungeon-check.mjs` exercises six real Spearhand cards plus four heroes in a generated dungeon. It uses temporary saves, muted audio, ordinary launcher and terminal AppArmor context. Existing source model is unchanged. Full [report](../../goblin-spearhand-dungeon.md) includes methodology and limitations.

Normal installed menu updated via checksum installer, previous AppImage/menu backed up. Local `.deb` also built. Label remains 0.8.7; public release/system Debian untouched. Already open personal game left running unchanged; restart to see new asset.

## Verification

- `npm test`: 358/358 pass.
- `npm run package:dir`, `npm run package:linux`: success (existing size/window-association warnings only).
- Build from staged Git index excluding unrelated dirty source: pass.
- Native launcher through user systemd + `aa-exec -p unconfined`: pass, six creatures/four heroes, 20s sample, 59.75 FPS at 1600×1000, p95 16.8 ms. All five states observed; every Spearhand walked/attacked, real hero hit/death checked.
- Same harness against exact menu AppImage: pass, 59.80 FPS, p95 16.8 ms, zero JS errors, same sandbox assertions.
- Audio mute flag, space-free staged executable, main unconfined and renderer Seccomp 2 verified; no no-sandbox override.
- Actual dungeon screenshots and silent MP4 reviewed. Capture follows timing sample. Test heroes have 500 HP/pass turns: presentation test, not balance certification. No Windows/low-end GPU/long soak test.
- Harness retries fixed selector, reaction-modal closure, melee approach and flattened process argument parsing; no unresolved model failure from those retries.

## Remaining / next steps

Bruce reviews actual dungeon footage and can restart normal menu game. Select another bounded owned-source creature if requested; no automatic batch restart. Full-roster production and broader style acceptance remain unfinished. Do not assume Git alone transfers the licensed candidate.

## Local-only state

Private original: `~/.local/share/four-lanterns-modular-pilot/2026-11-11/goblin-spearhand/`; staged GLB path/hash in report. Evidence under ignored `test-results/goblin-spearhand-dungeon/` and `test-results/goblin-spearhand-installed/`. Install backup under `~/.local/share/four-lanterns-install-backups/2026-11-11-spearhand/`.

Prior dirty files remain: native-check, other roster casts, authored generic creature routing, sling presentation, local-model Vite roster, older current.md sections; untracked creature-batch/docs/test scripts also preserved. Only task changes staged; no purchased binaries/media/installers/saves committed. Native test services finished; temporary staged-index build at `/tmp/fld-spearhand-index-review` can be removed after review.

## Sync

Checkpoint is on the same work branch; verify remote commit against local HEAD when resuming. This session pushes and verifies that branch before final delivery. No merge of the unfinished overall pipeline and no GitHub release.
