# Four Lanterns Deep

Bruce is the final design authority. Build a desktop single-player 3D isometric four-hero dungeon RPG, using fantasy Heroes of Legend. High-end presentation is a requirement, not optional polish.

Use the personal GitHub account with `/home/bmoser/.local/bin/gh-project` or `gh-personal`; never switch shared authentication.

Preserve source rules and keep computer-game adaptations explicit. Track full character-creation and ability automation coverage. Do not replace wound/recovery procedures with invented shortcuts. Keep source book and Foundry repositories untouched.

Record asset sources and licenses. Do not commit credentials, engine caches or downloaded editor binaries. Use `codex/` branches for implementation. Verify both rules behavior and actual desktop interaction; report untested surfaces honestly.

Bruce authorized self-review and merging passing PRs on November 5, 2026. Review the diff, run applicable checks, then merge; do not describe author review as independent review. Native Linux launch checks must exercise `launch-game.sh` directly without injected `--no-sandbox` flags.

On Ubuntu, native launch regression checks must also match the user terminal AppArmor context (`aa-exec -p unconfined`). The desktop agent profile can allow user namespaces and hide SUID/path-with-spaces failures. Keep sandboxing enabled; the launcher stages a space-free per-user runtime.

## Cross-machine local progress (required)

Execute locally; GitHub is the transport for source and explicit project memory. At the start of each session, read `docs/work-progress/current.md`, `docs/work-progress/README.md`, the newest dated handoff (excluding TEMPLATE), `decisions.md` and `machines.md` in that folder. Follow their linked feature docs as relevant. Treat chat history and handoff claims as context to verify against code and Git, not proof of current state.

When Bruce says “pull the repo and get the latest working progress” (or equivalent): inspect status/branch/worktrees first, fetch using the correct personal account, and fast-forward only when safe. Preserve dirty work; never reset, clean, force-push, discard or auto-stash unrelated edits. If local divergence blocks pulling, fetch and review remote changes without overwriting local work, then explain the specific conflict. Inspect the progress record's WIP branch/PR as well as main. Do not switch over dirty work. Report the active objective, completed work, next steps and local setup gaps; resume an explicitly pending task when requested.

During implementation, record meaningful decisions and unresolved failures. Before a pause, machine switch or final delivery of substantive work, update current progress and add a dated handoff using the template. Keep detailed feature docs current. Commit intended source/docs on a `codex/` branch and push a WIP checkpoint when unfinished; do not merge unfinished work. Verify the remote contains the checkpoint before claiming it is synced. If push fails, say the handoff remains local. A plain read-only question does not require a new checkpoint.

Never commit credentials, purchased source/export assets, real saves, generated installers, caches or local chat databases. Record private transfer requirements and machine-specific paths, but do not assume Git synchronizes them. Use `docs/work-progress/README.md` for the complete procedure.

## Creature production

For creature asset work, read `docs/creature-production/README.md` and run `node scripts/creature-production.mjs status`. The approved anchors are Goblin Spearhand, Air Elemental and Wolf. Work through the tracked humanoid-first queue one creature at a time; finish and record its model, motion, game-view and integration gates before starting another. This supersedes earlier full-roster generation batches. Use the approved asset manifest for delivery builds and preserve private inputs outside Git. Continue the recorded active creature rather than restarting from chat-only assumptions. Every creature brief must search and inspect the owned Dungeon Mason/KayKit clothing, gear and prop inventory, record candidate parts and creative role-appropriate attachment/modification choices, and justify any new geometry. For headwear and equipment, reuse or modify existing owned parts before creating geometry from scratch. Search `docs/creature-production/adapted-asset-library.md` too; register each useful modified item there with source/license, reproducible recipe, private editable path, fit/attachment, palette and review status so later creatures can reuse it. Supplied helmet/cap/hood forms are the fit and finish baseline; avoid shallow procedural caps. Plan coordinated color schemes for modified clothing/gear and preserve material/facial detail; use palettes to convey role and distinguish neighboring creatures, then review under dungeon lighting. Per Bruce’s November 11 update, defer performance benchmarks to a final bulk roster pass; per-creature checks cover appearance, equipment, animation and runtime visual routing. Defer packaging, installation, release delivery and user art review until the roster is ready for bulk review; do not rebuild/update the installed game after each creature. Continue through the queue without waiting for per-creature user approval. Bruce explicitly requests continuing across source/PR checkpoints; do not end work at an arbitrary batch boundary. Pause only for a significant unresolved failure or a problem that requires his decision.

## Quiet local testing

Bruce requests low-volume local testing. Launch automated game instances with `--mute-audio` (or an isolated silent audio sink), including music tests; assess their internal audio signals without audible desktop playback. Leave personal game sound preferences and the desktop master volume unchanged.
