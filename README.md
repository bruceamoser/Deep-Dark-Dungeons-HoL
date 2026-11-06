# Deep Dark Dungeons - HoL

A desktop, single-player, 3D isometric dungeon-delving RPG for four heroes, based on **Heroes of Legend**. Target: Linux and Windows, stylized dark fantasy, a persistent town, repeated descents and recoverable expedition losses.

**v0.6 — The Discipline Forge.** A playable dungeon RPG with game-owned character progression over HoL combat and survival mechanics. Eighteen discipline origins, 72 circular paths and 33 combined techniques share one persistent DP budget. See [implementation coverage and limitations](docs/implementation-status.md). The high-end presentation target remains an acceptance requirement.

## Download and install

Get the [latest release](https://github.com/bruceamoser/Deep-Dark-Dungeons-HoL/releases/latest). Windows has an installer; Debian/Ubuntu has a `.deb` package (`sudo apt install ./Deep-Dark-Dungeons-HoL-0.6.0-amd64.deb`). Other Linux systems can use the `linux-x64.tar.gz` bundle: extract it and run `bash install-linux.sh` to add the game to your applications menu. A standalone AppImage is also available. No development tools or GitHub account are needed. Initial Windows builds are unsigned.

The installed game checks for updates on startup and every four hours, downloads them in the background, and offers **Updates → Save & restart to install**. Your active journey is saved before installation. Updates preserve save files. v0.6 requires new journeys; earlier-edition runs remain on disk but cannot be loaded by this edition. Source-checkout/unpacked builds link to the release installer instead of self-updating. See [release details and publishing](docs/releases.md).

## Run from source

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

Packaging creates Linux AppImage/Debian packages or a Windows NSIS setup executable in `release/`, plus update metadata. `npm run package:dir` builds only the local Linux directory for `launch-game.sh`. Use the launcher for that unpacked build; use the installed release for automatic updates.

## Controls

- Click ground to move; 1–4 select a hero.
- Near opposition, movement stops and HoL alternating turns begin.
- Bow attacks fire modeled arrows; melee swings show the held blade and its trail. Fire, frost and life spells have distinct effects.
- Click an enemy to attack with the readied melee weapon or bow, or use Unarmed Strike with empty hands. Space ends a turn.
- Right-drag pans the camera; Q/E rotate; wheel zooms; F recenters and resumes exploration follow. Combat movement keeps the camera fixed.
- Formation chooses two by two, single file, wedge or line, with editable marching order.
- Hover a coffer, lost expedition cache or stairs to highlight it. Click for Inspect, Approach, Collect/Recover or travel, and Leave. Loot is collected deliberately through this menu; walking past it does not collect it.
- Actions opens the acting hero’s supported cards. Choose one, then click its target; self actions offer Use on self. Choose a different action to switch, or use Cancel, Escape or the same action again to leave targeting without spending.
- Heroes can pass willing companions but must end on an empty square. Prone occupied squares cost 2 movement. This is an explicit companion-passage adaptation; standing enemies still block.
- C / I opens the character command screen: animated equipment preview, pack, quick ready/stow, abilities and Journey. Star favorite actions to put them on the combat bar; 5–9 activate the first five. Shield Block is offered before eligible enemy attacks.
- Sound opens master volume, mute and a test sound. Audio starts on the first click or key press.
- Discover chambers, overcome encounters and bring treasure home to earn XP equally for living expedition members. Level 2 needs 400 XP; each subsequent level costs 175 more XP than the last, up to level 30. Journey shows totals, progress, recent awards and the reward rules. The discipline forge applies earned levels in town, adding 4 DP per level; damage, injuries and spent Grit persist.
- Return to entrance stairs to extract; gather at far stairs to descend. Every fifth floor has a guardian blocking onward travel and its coffer.
- Bestiary shows the 58 playable book creatures. Encounters use party levels and dungeon depth. Shift-click a creature to inspect its card.
- The market quarter has six merchants. Search coffers for individual magical items and choose who carries each. The sheet shows ten equipment slots and discipline requirements: a dormant enchanted weapon still works as an ordinary weapon.
- Find or buy a Scroll of Return. Read it outside combat with a free hand to reach town; Return to depth resumes the same preserved floor without healing.
- Red/green numbers show damage/healing; conditions have persistent visual effects.
- Runs (or Escape with no targeting/dialog open) pauses and saves. Name, copy, continue, create or delete independent journeys. Deletion asks for confirmation and keeps other runs intact. Save & exit run leaves the run paused in the library; Save & quit game closes the desktop application. Escape also opens Runs during mandatory combat decisions.
- The company register holds all living heroes, both the active four and the reserve. Create a hero saves a validated character to the repository; choose a slot and Assign to put them in the party. Replaced companions remain in reserve with their gear, injuries and XP. The Hall of Fallen Heroes records each resolved final death and preserves that hero's last state.
- The seven-step creator starts blank. Class, culture and background each grant a discipline origin; duplicate grants return 3 DP. Spend 8 starting DP in the forge, with unspent DP carried forward. Choose an equipment kit and up to 60 coins of additional supplies.
- The discipline atlas supports search, grab panning, wheel zoom, exact prerequisite inspection and refund previews. Learn additional disciplines for 3 DP from level 2. Rank II requires level 3 and four invested nodes; rank III requires level 7 and nine. Every touching circle is required for a confluence. Class signatures and mastery points have been replaced by these paths.
- Free town respec rebuilds origins and the whole tree while retaining the hero's trained level, possessions and injuries. Individual refunds remove dependent purchases and return their DP.
- Appearance offers sex, ancestry features, build/face, hair/facial hair and skin/eye/hair/clothing colors, with live rotation and zoom. Edit looks in town.
- The tactical grid shows real squares; teal/gold shading shows reachable/last-point movement. Hover for costs; G toggles exploration squares.
- Powers are game-designed over HoL mechanics. Ground actions preview areas; fire, water, smoke, barriers and other surfaces affect battlefield positioning.
- Recipes lets you learn, create or replenish supplies with tools and ingredient batches. Journey offers predictable field-dressing/restoration treatment or priced town care. Wound scars and spent Grit remain. Healing potions are usable from inventory or the combat bar.

Named saves live under the desktop application's user-data `runs/` directory (`~/.config/deep-dark-dungeons-hol/runs/` on this Linux installation). Development saves use browser local storage. Startup restores the active run, or opens the library if you exited it. Earlier-edition files, including an old `campaign.json`, are retained without conversion. Each slot includes its own hero repository and Hall; playing a slot autosaves only that slot. v0.6 saves use the new discipline ruleset; v0.5 journeys require the older release to play. Newly created heroes are saved immediately; final-death records trigger an immediate save.

## Design and provenance

[Production brief](docs/production-brief.md) · [Rules intake](docs/rules-intake.md) · [Computer-game proposals](docs/computer-game-deltas.md) · [Assets](docs/assets.md) · [Artcraft integration](docs/artcraft.md)

The authoritative book and Foundry repositories are not modified. Source files are imported from a pinned Git revision with per-file hashes in `docs/hol-source-lock.json`. Ordinary rest never refreshes Grit; all five wound tables are retained. Numerical wound effects, conditions, treatment and survival are integrated; game-specific recovery and power rules are documented explicitly.
