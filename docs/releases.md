# Releases and desktop updates

Published downloads live at https://github.com/bruceamoser/Deep-Dark-Dungeons-HoL/releases/latest. The public feed requires no client credentials. Never embed a GitHub token in a build.

Windows uses a per-user NSIS installer. Linux offers an amd64 Debian package with a configured root-owned sandbox helper and a space-free `/opt/deep-dark-dungeons-hol` installation, plus a static-runtime AppImage, with a small installer script that verifies the release checksums, copies it to a stable writable filename and creates a menu shortcut. Both keep Electron sandboxing enabled. Restricted Ubuntu AppImage installations need the root-owned mode-4755 sandbox helper supplied by a system Chrome/Chromium installation; the packaged launcher checks this before starting Electron. No global kernel settings are changed. Windows releases are currently unsigned.

`electron-updater` reads the packaged GitHub provider configuration. Only stable newer versions are accepted; downgrade and prerelease updates are disabled. Checks run after the save bridge is ready, every four hours, and on demand. Downloads run in the background with SHA-512 validation against the release metadata. The main process accepts only fixed update commands from the trusted main frame. Release text is not executed or rendered as HTML. The renderer cannot choose a feed, file or executable.

Installation is explicit. **Save & restart to install** sends the existing native-close save request. Only a successful disk-save acknowledgement invokes `quitAndInstall`; a save failure retains the downloaded update and reports the error. Automatic install-on-quit is disabled. The application displays Four Lanterns Deep. The app ID, executable filenames, save directory and update feed retain their original identifiers for upgrade compatibility. Local unpacked/development builds show a release-download link instead of claiming they can self-update. Source checkout launches remain useful for development; install the AppImage or Debian package to use release updates.

## Publishing

1. Use a `codex/` branch. Increment `package.json` and the lockfile, update `docs/release-notes.md`, and run rules tests, the native launcher suite, installer smoke tests and the update round-trip check.
2. Open a PR, review the diff and passing checks, then merge. The installer workflow builds Linux and Windows on their native runners and exercises the AppImage, installed Debian package and installed Windows executable before uploading CI artifacts.
3. Build the finished Linux AppImage/Debian packages and Windows portable directory locally with purchased Dungeon Mason exports staged privately. Tag the reviewed merged version, create a draft release and upload only finished apps, installation helpers, updater metadata and checksums. Public source-only CI builds must not replace these licensed apps.
4. Dispatch **Verify and publish staged release** for the draft tag. It checks hashes, runs the actual Linux AppImage/Debian installers and wraps/tests the finished Windows portable app as an NSIS installer. Only after both platforms pass does it publish the release as latest, with complete assets and updated checksums.
5. Verify the public release assets and live update check. Do not replace a published installer in place; corrections get a new version/tag.

Local commands: `npm run package:linux`, `npm run package:windows`; `npm run package:dir` retains the development launcher target. Build platforms sequentially when using the same checkout because Vite's output directory is shared. `node scripts/release-check.mjs <AppImage-or-installed-exe>` checks real rendering, saves and update IPC with isolated data; Linux also checks seccomp and the unconfined terminal AppArmor context. Tests must never use a real player save directory.

### Four Lanterns Deep display name (#78)

The v0.8.3 display name changes across loading screens, in-game branding,
window titles, desktop entries and installer shortcuts. The authored four-lantern
seal replaces the game mark; Greyhaven keeps its own town crest. The repository,
app ID, package name, platform executable filenames, update feed and user-data
directory retain their prior identifiers, so existing installs and saves continue.
Windows packaging explicitly pins the legacy executable filename independently
of the new product name. Linux menu entries and the portable installer use the
new friendly name. Historical release notes keep their original names.
