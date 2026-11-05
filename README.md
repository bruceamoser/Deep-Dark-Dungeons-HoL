# Deep Dark Dungeons - HoL

A desktop, single-player, 3D isometric dungeon-delving RPG for four heroes, based on **Heroes of Legend**. Target: Linux and Windows, stylized dark fantasy, a persistent town, repeated descents and recoverable expedition losses.

**Status: first playable foundation, not the complete game.** Full character creation is integrated from the existing HoL workshop; dungeon combat currently implements only a subset of the system. See [implementation coverage and limitations](docs/implementation-status.md). The high-end presentation target remains an acceptance requirement.

## Run

Use Node.js 22.12+:

```sh
npm ci
npm run build
npm start
```

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
- Click an adjacent enemy for Basic Melee/Unarmed. Space ends a turn.
- Q/E rotate; scroll zooms; F focuses the selected hero.
- Return to entrance stairs to extract; gather at far stairs to descend.
- The company register opens the full HoL character workshop; Recruit validates both creation stages before replacing a slot.

Saves use the desktop application's user-data directory. Development saves use browser local storage. Save before replacing or resetting a party.

## Design and provenance

[Production brief](docs/production-brief.md) · [Rules intake](docs/rules-intake.md) · [Computer-game proposals](docs/computer-game-deltas.md) · [Assets](docs/assets.md) · [Artcraft integration](docs/artcraft.md)

The authoritative book and Foundry repositories are not modified. Source files are imported from a pinned Git revision with per-file hashes in `docs/hol-source-lock.json`. Ordinary rest never refreshes Grit; all five wound tables are retained. Unsupported harm effects currently pause play instead of being replaced with invented rules.
