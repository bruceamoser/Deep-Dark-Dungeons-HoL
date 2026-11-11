# November 11 — Sequential humanoids, fitted bundle headwear and creative reuse

- Branch/worktree: `codex/sequential-creature-production` at `/home/bmoser/Projects/FLD-Creature-Production`, based on `fca55f7` (PR161).
- Task: continue the remaining roster one at a time. User steered the process during this work: defer performance until the entire roster is done; reuse/modify bundle headwear; use deliberate colors and creatively search owned props for every creature.
- Completion: six of 58 source-integrated (three original anchors plus Scrapper, Road Bandit, Shield Soldier); 52 remain. Next is Goblin Firestarter. This is a delivery checkpoint, not a claim that the full roster is complete or processing unattended.

## Delivered

Scrapper: approved goblin head/body, supplied Hat04 fitted cap, teal/ochre palette, knife/pouches/salvage. Final 31,582 triangles. Road Bandit: owned Body05, Hair02, curved sword, packed bedroll, olive/rust/leather palette; 6,132 triangles. Shield Soldier: Body13, supplied Hat02 minus only its two disconnected horns, green kite shield/steel palette and source thrust calibrated to point forward; 5,544 triangles. Each has 43 bones and five source clips. Brief/model/motion/game-view/integration evidence is in docs/creature-production.

The user rejected shallow authored headwear; that code was removed. Final supplied Soldier helmet and Scrapper cap were explicitly approved in chat. Earlier cap images/counts are superseded. A source HeadArmor01 attempt overlapped the separate head and was discarded; final Soldier uses Hat02 instead. Original sources untouched.

Runtime adds a hash-validated equipped-creature route preserving source materials/gear/clips. Soldier impact timing matches frame-9 extension. Queue supports reopening reviewed creatures, retaining prior evidence. Performance gate is replaced by actual game-view checks, with a final bulk performance pass explicitly pending.

## Verification / delivery

366 unit tests pass; focused pipeline/appearance tests rerun after revision status changes. AppImage and Debian build. Actual Three.js turnarounds and full five-state frame sequences visually inspected; final GLB reimports have zero degenerate faces/unweighted vertices. Per-creature bestiary/dungeon appearance checks passed with no JS errors. No per-creature FPS claims.

Exact primary `launch-game.sh` and menu AppImage both passed native full bestiary (58 entries/all five states for approved models), temporary save/close handshake and sandbox checks under `aa-exec -p unconfined`, with muted audio. Local menu installation updated via checksummed installer; old AppImage/menu backed up under `~/.local/share/four-lanterns-install-backups/2026-11-11-humanoid-wave01/`. Version remains 0.8.7; no public release, system Debian replacement or Windows test. Real saves/audio settings untouched.

## Mandatory direction

Read the active workflow before resuming. Every creature brief must search and inspect owned clothing/headwear/gear/nonweapon props, record candidate parts, creative selected props and fit/palette/attachment plans, and justify any missing new geometry. Color schemes must convey role/personality and stay readable under dungeon lighting. Keep animals appropriate; do not add random costume clutter. Verified nonweapon inventory is linked from the workflow.

## Private state and resume

`~/.local/share/four-lanterns-creature-production/{goblin-scrapper,road-bandit,shield-soldier}` contains editable Blender, GLB, provenance/hashes, roundtrip/validation, review frames and game-view evidence. Six approved GLBs copied into both clean worktree and original checkout. Purchased sources remain in the workshop; Git cannot transfer these files. Older replaced GLBs backed up under `prior-runtime-files/`.

Original checkout's unrelated dirty creature experiments are preserved. Do not switch/reset it or package from those files. Clean worktree contains intended source only. Restart Vite after manifest changes (reading JSON via fs does not always trigger config reload); don't edit watched source during an automated visual review. Final pipeline update/PR records the source checkpoint. Continue Goblin Firestarter after syncing this checkpoint.
