# November12 — All58 creature sources integrated; delivery underway

- Machine: bmoser/Linux. Worktree FLD-Creature-Production, branch codex/creature-roster-production-39, base Wraith da52e5a plus queue fixture correction c17dc93. Wraith PR203 merged after CI pass.
- Last Mire Ooze: private six-bone slime, two owned bone scraps, TextureCraft wet mud palette.475frames/five clips, actual game/bestiary, source-ground/reimport pass;116008triangles. Three inherited junctions retained.
-379tests pass; required-assets Linux AppImage/deb built. Native bulk performance and installed-menu qualification remain. New performance harness measures each roster entry with six enemies/four boosted-HP heroes; actual AI turns, no timing screenshots.
- Agent process now inherits NoNewPrivs1, blocking SUID sandbox even with aa-exec. Normal systemd user service has NoNewPrivs0; launch QA there, retaining aa-exec unconfined/mute/sandbox and isolated test saves. No no-sandbox workaround.
- Private assets/media in ~/.local/share/four-lanterns-creature-production; Git carries recipes/hash/docs. Existing seven-creature installed AppImage untouched so far. No public release/Windows verification.
- Continue through native checks, performance fixes if needed, local menu install, final review sheets/docs. This checkpoint is not a reason to stop. Push verification follows commit.
