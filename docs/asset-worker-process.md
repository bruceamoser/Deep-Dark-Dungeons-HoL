# Parallel creature-asset workers

Bruce authorized parallel DeepSeek workers with GPT organizing, reviewing submissions and returning revisions on November 10, 2026. This extends the one-off worker review into model authoring. The immediate goal remains recognizable roster coverage before high-capability detail refinement.

## First wave

Three workers run concurrently: Stone Knuckle, Kobold Tunnel Scout and Plague Zombie. Each has a separate workspace under the machine-local `~/.local/share/four-lanterns-workers/2026-11-10-wave-01/`, copied read-only reference/donor inputs, a bounded task contract and a separate Blender background process. No worker connects to the shared Blender MCP scene or changes game files.

Workers use the verified `deepseek` Codex profile, workspace-write sandbox restricted to their own job, cloud/MCP integrations disabled, a 20-minute run limit and Blender at most four CPU threads. Three is the initial concurrency cap on this machine, not an unlimited agent swarm. Generation services and new purchases remain out of scope. Credentials are resolved by the local helper, never included in task inputs, output files or Git.

## Submission and review

1. Organizer assigns one creature, source description/illustration, donor/license, permitted output locations and concrete anatomy/role requirements.
2. Worker submits reproducible builder, editable `.blend`, GLB, structural inspection, front/side/back renders and a candid limitations report.
3. Organizer checks paths/source integrity and exported data, then independently renders the GLB with the actual Three.js animation library. File existence and worker self-ratings do not establish acceptance.
4. Organizer returns specific findings in `REVIEW.md` to the same isolated job. A bounded revision run addresses them. Keep the rejected render/report as evidence rather than silently treating it as accepted.
5. Only accepted submissions are copied into the game branch, with provenance, score/limitations and shared rig/runtime integration checked. Workers never merge their own submission into main.
6. Validate actual muted desktop interaction, retain source originals, run applicable repository checks, then author-review and merge under existing authorization.

States: **running → submitted → changes requested → accepted → integrated**. A submission can instead remain deferred/rejected when anatomy, rigging, licensing or quality is unsuitable. Do not force acceptance just to keep the queue moving. Author review, limited automated review and actual independent review must be described accurately.

## What stays shared and what stays isolated

The reference catalogue, style goals, animation contract and acceptance rubric are shared knowledge. Live scenes, output files and worker edits are isolated. Each worker uses the existing 23-bone rig where appropriate and validates new geometry/weights without destructive global cleanup. No silent changes to stats, abilities, progression or saved IDs.

Git carries accepted sources/models, provenance, decisions and checkpoint records. Raw worker logs, API usage, renders, local credentials and installed tools are machine-local. Before switching machines, push a WIP checkpoint for unfinished integration and record exact pending job paths/status; never merge incomplete work merely because workers have finished.

## Repeatable local runner

Prepare an isolated job directory under `~/.local/share/four-lanterns-workers/` with `AGENTS.md`, `TASK.md`, copied permitted donor/reference inputs and explicit outputs/budgets. The organizer chooses the creatures and authorizes each wave; this script does not launch an unattended roster-wide swarm.

```sh
python3 scripts/toolchain/run_asset_worker.py /absolute/local/job --image /absolute/local/job/input/reference.webp --minutes 15
# After reviewing a submission and writing concrete REVIEW.md findings:
python3 scripts/toolchain/run_asset_worker.py /absolute/local/job --revision --image /absolute/local/job/review/contact-sheet.png --minutes 12
```

This Linux runner uses the existing DeepSeek profile/helper, disables locally registered MCP servers for the job, locks against concurrent writes to the same job, and writes local timestamped event/final/run records. It kills its own process group and only task-owned headless Blender processes on completion/timeout; Codex tools can otherwise leave detached Blender processes behind. A fake-worker smoke check verified descendant cleanup without an extra model call. The initial wave was launched directly via the equivalent Codex commands before this wrapper existed; the wrapper itself has not yet run a live API job.

The first wave exposed repeated Blender shutdown hangs after successful exports, leaving completed processes resident. These were confined to the three jobs and stopped; no personal Blender window or system audio settings were changed. Builders now exit after successful writes and have a kill-after bound. The organizer remains responsible for limiting concurrency and judging submissions rather than trusting a successful CLI exit.

## Wave-01 result

All three workers submitted real model builders, editable sources, GLBs and inspection/renders. The organizer returned the zombie once for a detached-looking head, clean mummy silhouette and washed-out color. Its revision was accepted for recognizable coverage after new Three.js/animation and native-game review. Stone and kobold passed their first organizer review after worker self-revisions. This is author/organizer review, not an independent art review.

[Wave report](creature-model-wave-01.md) records quality scores, limitations and verification. [Portable builders](../scripts/toolchain/creature-workers/README.md) retain reproducible source. Raw job transcripts, API credentials and rejected renders remain local. No release or full-roster completion is implied.
