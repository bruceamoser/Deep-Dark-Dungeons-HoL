# 2026-11-09 — Local cross-machine handoff process

- Machine/platform: Bruce's Linux desktop.
- Task: make project progress and instructions portable through GitHub while executing locally.
- Work branch: `codex/local-work-handoff`.
- Base commit: `7aa7091` (v0.8.3).
- Status: process implementation; consult branch/PR history for merge state.

## Completed

Added `docs/work-progress/` with current status, operating procedure, durable decisions, machine requirements and a handoff template. Root `AGENTS.md` requires startup and checkpoint maintenance; README links the workflow.

Reviewed changes since v0.6.0, including camp/provisions, foraging, fractional Bulk, combined supplies, town routing, modular characters, music, counters, shortcuts and direct interactions. Detailed current behavior remains in existing feature docs.

## Verification

Documentation links and Git whitespace checks are the applicable checks for this documentation-only change. No gameplay tests are required. Prior installed 0.8.3 smoke verification and its local-runtime caveats are recorded in `../current.md`.

## Next steps

After merging this process, new machines should pull and follow `AGENTS.md`. No further gameplay request is assigned. End future work sessions by updating current status, adding a checkpoint, and pushing the intended branch.

## Local-only state

The corrected desktop shortcut and refreshed ignored runtime exist only on this Linux desktop. Purchased assets and real saves require separate private transfer if needed. No secrets or player saves are part of this checkpoint.

## Sync status

This checkpoint is delivered on `codex/local-work-handoff`; the executing agent must verify its remote push before reporting it synced. Merge/publication state is available in Git/PR history rather than a self-referential commit hash.
