# 2026-11-10 — Parallel DeepSeek creature workers

- Machine/platform: bmoser desktop, Ubuntu Linux; quiet native testing.
- Task/result: implement Bruce's parallel model-worker/reviewer approach on three creatures.
- Work branch: `codex/deepseek-creature-wave-01`.
- Base: `1244c0acf0b1e0491a8ea0cc9315cc6b91e422fd` (main after PR #153).
- Status: implementation and local verification complete; use branch/PR history for author review, CI and merge state. No release requested.

## Completed

Three actual DeepSeek Flash CLI jobs authored Stone Knuckle, Kobold Tunnel Scout and Plague Zombie concurrently in isolated directories/Blender processes. GPT inspected scripts/GLBs and rendered shared game clips, returned specific zombie issues, reviewed its revision, and integrated all three. Bruce says these are looking good for a first pass.

New GLBs and editable Blender sources, portable builders, exact provenance/counts, scoped fit rescore (6→83, 14→77, 23→73), model-only preview, a separate pre-integration Three.js review utility and a bounded future worker runner. Game casts those three IDs onto new rigs; kobold tail callback supports its extra joints. No stats, rules, IDs or saves changed. See [wave report](../../creature-model-wave-01.md) and [worker process](../../asset-worker-process.md).

## Decisions

Parallelize different assets in isolated scenes; organizer alone accepts/integrates/merges. Keep three-worker cap and time bounds. First-pass recognizability is useful; preserve editable sources for later anatomy/material refinement. Kobold/zombie remain below the target 80 identity score, accepted with limitations rather than claimed final art. Source-book/Foundry/original donor files untouched; no paid cloud mesh generator.

## Verification

358 unit tests pass; all three portable builders rerun byte-identically; GLB reimport inspections show no unweighted/loose vertices or zero-area faces. Separate Three.js front/side/back/pose checks and actual appearance-factory captures inspected. Native checks pass through exact `launch-game.sh`, terminal-matching AppArmor/SUID sandbox, `--mute-audio`: seven authored creatures, distinct finite idle/walk/attack/hit/death poses, actual visibility, all 58 creature adapters/17 condition layers, isolated save and window-close handshake. Build command `npm run package:dir` refreshes checkout runtime only, still labeled 0.8.7. Logs `/tmp/fld-wave01-{tests,package,native,native-pilots}.log`.

A test-scene layout initially left several actors outside party vision; compact layout/visibility assertions fixed and rerun. Finished Blender processes sometimes hung on shutdown; only task-owned background processes were cleaned. New runner's fake-worker descendant-cleanup smoke passes, Python/JS syntax passes. That exact wrapper has not run a live API job. Windows desktop interaction remains untested locally; repository installer CI is separate evidence.

## Remaining and next steps

Continue bounded batches selected from the failed-cast audit, with game-scale/animation review. Later refine stone symmetry/surface variation, kobold proportions/scales/grip and zombie anatomy/shroud/texture breakup. No remaining worker job is pending for this wave. Do not publish a new release unless requested; installed package is unchanged.

## Local-only state / transfer needs

Raw jobs, prompts, rejected/accepted review renders and event usage: `~/.local/share/four-lanterns-workers/2026-11-10-wave-01/`. No active API worker or task-owned headless Blender remains. Vite inspection server may remain on 5187 until session cleanup. Git carries accepted `.blend`/GLBs/builders/docs; profile/key/tool installs and raw job history require separate setup/transfer. Do not copy credentials into repo or logs. Existing purchased hero exports remain private.

## Sync status

Intended checkpoint is the work branch above; verify origin/PR state using the personal `gh-project` helper and Git history. Never infer synchronization from a local file. Commit/push/author-review/merge occur after these records are written; final delivery reports their observed result.
