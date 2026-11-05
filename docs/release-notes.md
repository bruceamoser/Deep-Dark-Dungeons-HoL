The first downloadable release of **Deep Dark Dungeons - HoL**, a single-player dungeon RPG for a party of four heroes. This is an early playable build; rules coverage, art and balance remain in development.

### Install

- **Windows 10/11, 64-bit:** download and run `Deep-Dark-Dungeons-HoL-Setup-0.2.0-x64.exe`. The installer adds Start-menu and desktop shortcuts. This initial build is unsigned, so Windows may show an unknown-publisher warning.
- **Linux, 64-bit:** download the `linux-x64.tar.gz` bundle, extract it and run `bash install-linux.sh` inside the extracted folder. Open the game from your applications menu. Alternatively, download just the AppImage, mark it executable and run it directly. On Ubuntu systems that restrict user namespaces, install Google Chrome or Chromium to provide the trusted sandbox helper; the game does not disable sandboxing.

You do **not** need Node.js, Electron, Git or a GitHub account to play.

### Updates and saves

The installed game checks GitHub Releases at startup and every four hours, automatically downloads newer stable versions, and displays **Update ready**. Open **Updates → Save & restart to install** when convenient. It saves the active journey before installing. Failed saves prevent installation; failed downloads can be retried. Named runs, character repositories and fallen heroes remain in your user-data directory. Existing source-project saves use that same directory.

### Included

- Four-hero exploration and turn-based HoL combat, a town market, procedural floors and bosses every fifth depth.
- 58 source-book creatures, discipline-gated magical gear, recall scrolls, XP and town training.
- Named saved runs, a hero repository and Hall of Fallen Heroes.
- Game-styled character creation, visible culture/background grants, discipline filters, level-zero purchase rules and preserved scroll positions.
- Character equipment previews, favorite actions, arrows, weapon swings, damage numbers and condition effects.

See the repository's `docs/implementation-status.md` for the remaining rules and presentation work. These are early-access game builds, not a declaration of complete HoL implementation.
