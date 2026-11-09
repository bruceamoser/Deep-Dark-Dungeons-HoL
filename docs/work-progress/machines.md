# Machine setup and local-only state

## Every computer

- Clone `https://github.com/bruceamoser/Four-Lanterns-Deep.git`, then read root `AGENTS.md` and this folder.
- Use Node.js 22.12+ and `npm ci`. Follow README for development and platform packaging.
- Configure personal GitHub access locally. On Bruce's Linux desktop use `gh-project` / `gh-personal`; if unavailable elsewhere, use an explicitly personal, process-scoped credential. Never switch shared account state. Never copy credentials into Git.
- Read `docs/dungeon-mason-characters.md`, `docs/assets.md` and `docs/releases.md` before staging assets or producing releases. Purchased sources/exports must be supplied separately through private storage. A source checkout is not a finished licensed build.
- Artcraft/Blender and MCP connections are machine-local. Consult `docs/artcraft.md` and `docs/mcp-servers.md`; inspect availability rather than assuming paths from another machine exist.
- Pulling code does not refresh `dist/`, `release/`, dependencies or the staged launcher runtime. Rebuild deliberately after source changes. Installed releases and checkout builds are separate launch targets.

## Known Linux desktop details (2026-11-09)

Checkout: `/home/bmoser/Documents/ChatGPT/HoL Procedural Game` (the old folder name is intentional).
Installed Debian executable: `/opt/deep-dark-dungeons-hol/deep-dark-dungeons-hol`.
Menu entry basename and save-directory identifiers retain the legacy name for compatibility; the visible name is **Four Lanterns Deep**.

User menu entries override system entries. Inspect both `~/.local/share/applications/` and `/usr/share/applications/` if a menu launches an old version. Check packaged `resources/app.asar` version rather than relying only on the source package version.

Linux sandbox checks must preserve sandboxing and match the ordinary terminal AppArmor context. An agent process with `NoNewPrivs=1` cannot exercise a SUID helper; use a suitable normal desktop/terminal session and report the distinction.

## Not synced by this process

Uncommitted or ignored files, purchased assets, real save games, installed packages, user application shortcuts, secrets, environment variables, editor state, running processes and machine-local chat storage. Record required transfers in each handoff; do not silently assume they exist elsewhere. Do not commit or modify real player saves as test fixtures.
