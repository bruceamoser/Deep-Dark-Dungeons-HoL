# Deep Dark Dungeons - HoL

Bruce is the final design authority. Build a desktop single-player 3D isometric four-hero dungeon RPG, using fantasy Heroes of Legend. High-end presentation is a requirement, not optional polish.

Use the personal GitHub account with `/home/bmoser/.local/bin/gh-project` or `gh-personal`; never switch shared authentication.

Preserve source rules and keep computer-game adaptations explicit. Track full character-creation and ability automation coverage. Do not replace wound/recovery procedures with invented shortcuts. Keep source book and Foundry repositories untouched.

Record asset sources and licenses. Do not commit credentials, engine caches or downloaded editor binaries. Use `codex/` branches for implementation. Verify both rules behavior and actual desktop interaction; report untested surfaces honestly.

Bruce authorized self-review and merging passing PRs on November 5, 2026. Review the diff, run applicable checks, then merge; do not describe author review as independent review. Native Linux launch checks must exercise `launch-game.sh` directly without injected `--no-sandbox` flags.

On Ubuntu, native launch regression checks must also match the user terminal AppArmor context (`aa-exec -p unconfined`). The desktop agent profile can allow user namespaces and hide SUID/path-with-spaces failures. Keep sandboxing enabled; the launcher stages a space-free per-user runtime.
