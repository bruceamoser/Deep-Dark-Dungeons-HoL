# Deep Dark Dungeons - HoL

A desktop, single-player, 3D isometric dungeon-delving RPG for four heroes, based on **Heroes of Legend**. Target: Linux and Windows, stylized dark fantasy, a persistent town, repeated descents and recoverable expedition losses.

**Status: first playable foundation, not the complete game.** Full character creation uses a native game interface backed by the pinned HoL validators; dungeon combat currently implements only a subset of the system. See [implementation coverage and limitations](docs/implementation-status.md). The high-end presentation target remains an acceptance requirement.

## Run

Use Node.js 22.12+:

```sh
npm ci
npm run build
npm start
```

On Linux, use `./launch-game.sh` or the installed application-menu entry. The launcher can reuse a root-owned, mode-4755 sandbox helper from an installed Google Chrome or Chromium, scoped only to the game process. This supports Ubuntu's restricted user namespaces without `--no-sandbox`. The launcher rejects stale inherited helper overrides and repairs the packaged helper path to a symlink to that trusted system helper. No sudo, sandbox-disabling flags or global kernel changes are required on this machine. The launcher also keeps a versioned runtime copy under `~/.local/share/deep-dark-dungeons-hol/runtimes/`: Chromium’s SUID launch can split executable paths at spaces under ordinary Ubuntu terminal confinement. Your project and saves stay in their original locations. Always use the launcher after repackaging.

For development, `npm run dev` opens a local browser-hosted renderer. Production uses a desktop Electron shell with isolated renderer permissions and local saves.

```sh
npm test
npm run package:linux
npm run package:windows
```

The Linux executable is `release/linux-unpacked/deep-dark-dungeons-hol`. Windows packaging creates a ZIP in `release/`; extract it and run `Deep Dark Dungeons - HoL.exe`. Windows runtime behavior has not yet been tested.

## Controls

- Click ground to move; 1–4 select a hero.
- Near opposition, movement stops and HoL alternating turns begin.
- Bow attacks fire modeled arrows; melee swings show the held blade and its trail. Fire, frost and life spells have distinct effects.
- Click an enemy to attack with the readied melee weapon or bow, or use Basic Unarmed with empty hands. Space ends a turn.
- Right-drag pans the camera; Q/E rotate; wheel zooms; F recenters and resumes exploration follow. Combat movement keeps the camera fixed.
- Formation chooses two by two, single file, wedge or line, with editable marching order.
- Hover a coffer, lost expedition cache or stairs to highlight it. Click for Inspect, Approach, Collect/Recover or travel, and Leave. Loot is collected deliberately through this menu; walking past it does not collect it.
- Actions opens the acting hero’s supported cards. Choose one, then click its target; self actions offer Use on self. Choose a different action to switch, or use Cancel, Escape or the same action again to leave targeting without spending.
- Heroes can pass willing companions but must end on an empty square. Prone occupied squares cost 2 movement. This is an explicit companion-passage adaptation; standing enemies still block.
- C / I opens the character command screen: animated equipment preview, pack, quick ready/stow, abilities and Journey. Star favorite actions to put them on the combat bar; 5–9 activate the first five. Shield Block is offered before eligible enemy attacks.
- Sound opens master volume, mute and a test sound. Audio starts on the first click or key press.
- Discover chambers, overcome encounters and bring treasure home to earn XP equally for living expedition members. Level 2 needs 1,000 XP; each subsequent level costs 250 more XP than the last. Journey shows totals, progress, recent awards and the reward rules. Develop this hero applies earned levels in town using HoL's training rules; damage, injuries and spent Grit persist.
- Return to entrance stairs to extract; gather at far stairs to descend.
- The company register holds all living heroes, both the active four and the reserve. Create a hero saves a validated character to the repository; choose a slot and Assign to put them in the party. Replaced companions remain in reserve with their gear, injuries and XP. The Hall of Fallen Heroes records each resolved final death and preserves that hero's last state.
- The eight-step creator starts blank; saved drafts and example characters are explicit choices. Separate discipline/ability purchase dialogs show owned ranks, book symbols and action letters. Equipment lists granted gear before additional shopping.
- Journey offers matching one-hour wound treatment in town, with one attempt per wound per campaign day. Healing potions are usable from inventory or the combat action bar.

Saves use the desktop application's user-data directory. Development saves use browser local storage. Startup automatically restores the saved campaign and hero repository. Older saves retain their party and earned levels, which migrate to the matching minimum XP. Newly created heroes are saved immediately; final-death records trigger an immediate save.

## Design and provenance

[Production brief](docs/production-brief.md) · [Rules intake](docs/rules-intake.md) · [Computer-game proposals](docs/computer-game-deltas.md) · [Assets](docs/assets.md) · [Artcraft integration](docs/artcraft.md)

The authoritative book and Foundry repositories are not modified. Source files are imported from a pinned Git revision with per-file hashes in `docs/hol-source-lock.json`. Ordinary rest never refreshes Grit; all five wound tables are retained. Numerical wound effects, conditions, treatment and survival are integrated; exceptional anatomical remedies and the remaining rules coverage are documented explicitly.
