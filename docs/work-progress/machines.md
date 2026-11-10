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

## Linux checkout used for player feedback fixes (2026-11-09)

Checkout: `/home/bruce/Projects/Deep-Dark-Dungeons-HoL`; conversation placeholder `/home/bruce/Documents/ChatGPT/Deep-dark-dungons` is not the code repo. Node 22.22.1. Personal `gh` identity verified as `bruceamoser`; the other machine's `gh-project`/`gh-personal` helper paths are absent. No global authentication switch.

Network/Git metadata/desktop checks require the environment's approved escalated execution. Actual `launch-game.sh` through `aa-exec -p unconfined` qualifies sandboxing here. Source changes require deliberate `npm run package:dir`; pulling does not replace the installed package. On November 10, installed Debian was verified at 0.8.6 and left unchanged; public 0.8.7 is available through Settings → Updates. Checkout runtime/builds are 0.8.7. Use TMPDIR="$PWD/release/qa-tmp" for builds/QA because /tmp is nearly full; the main-disk retry resolved Debian packaging failure. Preserve ignored licensed exports and untracked superseded Borin prototypes.

## Not synced by this process

Uncommitted or ignored files, purchased assets, real save games, installed packages, user application shortcuts, secrets, environment variables, editor state, running processes and machine-local chat storage. Record required transfers in each handoff; do not silently assume they exist elsewhere. Do not commit or modify real player saves as test fixtures.

## bmoser asset toolchain — November 10

Blender 5.2.4 LTS is installed under `~/.local/opt`, with `~/.local/bin/blender` and a user application-menu entry. Rigify and the matching MCP for Blender 2.2.7 add-on are enabled. `mcp-for-blender` is an isolated uv tool; the loopback bridge uses port 9876 with telemetry disabled for the configured session. See [pipeline setup](../asset-production-pipeline.md). Meshy is deferred. An isolated Blender workspace may be open; do not assume personal windows are disposable.

DeepSeek is available through the separate `codex --profile deepseek` file and scoped provider catalog. GPT remains default. The key is entered with `fld-credentials set deepseek` and stored outside Git; command-backed auth reads it. Never copy its value into configuration, logs or this repo. Neither credentials nor local tool/config installations travel with Git; another machine needs its own setup. Live Responses/CLI/Blender read-only tests passed; this chat’s built-in collaboration model list and mixed-provider desktop picker were not modified or verified.

## bmoser parallel asset jobs — November 10

Wave-01 local job root: `~/.local/share/four-lanterns-workers/2026-11-10-wave-01/`. Three authoring runs and one zombie revision completed; accepted sources/GLBs/builders are in Git, rejected renders/transcripts remain local. No API workers remain running. Background Blender jobs can hang during audio/shutdown in the worker sandbox even after writing outputs; builders exit on success and the Linux runner limits time and cleans only task-owned headless processes. Do not terminate personal Blender windows.

The new local runner requires Python 3.11+ (`tomllib`), Linux `/proc`/`fcntl`, the existing DeepSeek Codex profile and credentials helper. The wrapper's fake-worker cleanup test passed initially; wave 02 subsequently verified live authoring and revision paths. Original wave calls used the equivalent direct Codex CLI. Accepted portable builders were rerun byte-identically with Blender 5.2.4 LTS. See [worker process](../asset-worker-process.md). Git does not install Blender/profile/credentials on another machine.

## bmoser wave-02 checkpoint — November 10

`~/.local/share/four-lanterns-workers/2026-11-10-wave-02/` holds three completed authoring and four completed revision jobs; all exited zero without timeout or remaining task-owned Blender. Accepted GLBs/.blend/builders/provenance are versioned; raw job/review history remains local. Checkout launcher includes wave 02, version label 0.8.7; installed package/public release unchanged. Native tests use silent audio and isolated saves. Windows packaging/interaction were not run for this batch. Another machine still needs its own Blender/DeepSeek setup and credentials helper; Git does not transfer those.

## bmoser wave-03 checkpoint — November 10

Three completed authoring plus three completed revision jobs under `~/.local/share/four-lanterns-workers/2026-11-10-wave-03/`, all exit zero without timeout or remaining task-owned Blender. Accepted sources/models/builders are versioned; raw transcripts/rejected rig drafts remain local. All three builders rerun byte-identically with Blender 5.2.4 LTS. Checkout launcher includes wave 03, labeled 0.8.7; installed/public release unchanged. Native testing is muted/isolated; Windows packaging/interaction not run. The development capture tool now resolves Vite's timestamped dependency instances so long-running inspection servers do not silently produce rest-pose captures. Stop the task-owned 5187 server during delivery cleanup.

## bmoser wave-04 checkpoint — November 10

Four successful DeepSeek calls under `~/.local/share/four-lanterns-workers/2026-11-10-wave-04/`: three parallel authors; Marshal/Ash incorporated live returned findings, Werebear one separate revision. No timeout/task-owned Blender remains. Accepted models/.blend/builders/provenance are versioned; rejected renders/transcripts local only. Muted native 16-actor/58-adapter/17-condition/launcher/save checks pass; checkout 0.8.7 refreshed, installed/public unchanged. Windows not exercised. Task-owned5187 inspection server stopped during deliverycleanup. Git does not transfer Blender/profile/credentials/private assets.

## bmoser bestiary viewer checkpoint — November 10

Checkout launcher includes the live book/model comparison for all 58 entries after a package rebuild, still labeled 0.8.7. Final muted native comparison/control/context-cleanup and exact sandboxed launcher/save checks pass. Installed/public release unchanged; Windows not exercised. Test screenshots/logs stay local; code/docs transfer through Git. Task-owned Vite 5187 stopped during delivery cleanup. No pending API/Blender worker.

## bmoser wave-05 installation — November 10

Normal menu target is now the current local AppImage `~/.local/share/deep-dark-dungeons-hol/Deep-Dark-Dungeons-HoL.AppImage`. Supported checksum installer creates user desktop override and preserves real save paths. Previous desktop entry backed up under `~/.local/share/four-lanterns-install-backups/2026-11-10-wave-05/`. Root-owned Chrome helper from `/opt/google/chrome/chrome-sandbox` provides sandboxing; no global kernel setting changed. System `/opt` Debian installation is untouched. Source label 0.8.7, unpublished local review build; do not confuse it with the immutable public 0.8.7 binary. AppImage and Debian files are local/ignored under release/.

Final installed-target native checks pass 19 updated actors,58 bestiary comparisons/controls/cleanup, sandbox and isolated save/close; default checkout checks also cover 58 adapters/17conditions. Both muted. Six successful DeepSeek calls, no remaining job Blender. Windows not exercised. Experimental Modly/rigging tools/weights remain uninstalled; a pilot is next. Git does not transfer installed binaries/private hero exports/credentials/toolchains.

## bmoser local generation pilot — November 10

Supersedes the earlier uninstalled-tool note: isolated Modly v0.4.3/TRELLIS2-GGUF/Python3.11+torch2.6cu126 now run locally under `~/.local/share/four-lanterns-pipeline-pilot/2026-11-10`. About 10.4 GB pinned model weights plus preprocessing model; both generation and texturing completed on one RTX3090. Mesh2Motion npm app installed and real browser rig/export/playback exercised. Private safe Vite override avoids exposing process environment. AssetFurnace source inspected only. No Meshy account/cloud inference, personal Blender scene or game installation changed. See exact pins and local evidence in [pilot report](../local-mesh-pipeline-pilot.md). Raw mesh/model environments and exploratory job scripts are not transferred by Git.
