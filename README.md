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
- Click an enemy to attack with the readied melee weapon or bow, or use Basic Unarmed with empty hands. Space ends a turn.
- Right-drag pans the camera; Q/E rotate; wheel zooms; F recenters and resumes exploration follow. Combat movement keeps the camera fixed.
- Formation chooses two by two, single file, wedge or line, with editable marching order.
- Actions opens the acting hero’s supported cards. Choose one, then click its target; Esc cancels targeting.
- C / I opens the character command screen: animated equipment preview, pack, quick ready/stow, abilities and Journey. Star favorite actions to put them on the combat bar; 5–9 activate the first five. Shield Block is offered before eligible enemy attacks.
- Sound opens master volume, mute and a test sound. Audio starts on the first click or key press.
- Clear a depth and return to Greyhaven to earn a level. Develop this hero opens training; committed choices, damage, injuries and spent Grit persist.
- Return to entrance stairs to extract; gather at far stairs to descend.
- The company register opens the eight-step creator; Recruit validates both creation stages before replacing a slot.
- Journey offers matching one-hour wound treatment in town, with one attempt per wound per campaign day. Healing potions are usable from inventory or the combat action bar.

Saves use the desktop application's user-data directory. Development saves use browser local storage. Save before replacing or resetting a party.

## Design and provenance

[Production brief](docs/production-brief.md) · [Rules intake](docs/rules-intake.md) · [Computer-game proposals](docs/computer-game-deltas.md) · [Assets](docs/assets.md) · [Artcraft integration](docs/artcraft.md)

The authoritative book and Foundry repositories are not modified. Source files are imported from a pinned Git revision with per-file hashes in `docs/hol-source-lock.json`. Ordinary rest never refreshes Grit; all five wound tables are retained. Numerical wound effects, conditions, treatment and survival are integrated; exceptional anatomical remedies and the remaining rules coverage are documented explicitly.
