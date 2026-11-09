# Local work, shared progress

All development runs locally. GitHub carries code, instructions and handoff records between machines. Chat history is supplementary; do not assume another machine has it.

## Start or switch machines

Say: **“Pull the repo and get the latest working progress.”**

The agent must follow the repository-root `AGENTS.md`, inspect local work before fetching, then read `current.md`, the newest handoff, `decisions.md` and `machines.md`. Fetch first; fast-forward clean branches only. Inspect active branches/PRs rather than assuming main contains unfinished work. Report the current task, what is already done, what remains and machine-specific gaps before continuing.

## Finish or pause

Say: **“Save working progress so I can switch machines.”**

Update `current.md` and add a dated handoff under `handoffs/`. Record the actual work branch and base commit, changed files, decisions, verification results, failures, next steps and any private files that need separate transfer. Commit the intended source changes and docs to a `codex/` branch and push it, even if the feature is unfinished. Label incomplete work clearly; pushing a WIP branch does not mean merging or releasing it. Verify the remote branch contains the checkpoint, and report anything still local.

GitHub cannot preserve uncommitted files, ignored assets, running processes, local databases or chat-only decisions. Never call a handoff synced until its commit is on the remote. If offline, save locally and clearly report that transfer remains pending.

## Records

- `current.md`: concise current task and exact resume instructions; replace stale status.
- `handoffs/`: dated checkpoints, one file per session (date plus descriptive slug; add a suffix if needed).
- `decisions.md`: durable decisions and their rationale; identify what supersedes earlier choices.
- `machines.md`: portable setup requirements and known local differences. No credentials.
- Existing feature docs remain authoritative for detailed system behavior. Link to them instead of copying their contents.

Use `handoffs/TEMPLATE.md` for checkpoints. Keep these records factual: distinguish requested, implemented, tested, merged and released. Never record secrets or raw private asset contents.
