# Releases and desktop updates

Published downloads live at https://github.com/bruceamoser/Deep-Dark-Dungeons-HoL/releases/latest. The public feed requires no client credentials. Never embed a GitHub token in a build.

Windows uses a per-user NSIS installer. Linux offers an amd64 Debian package with a configured root-owned sandbox helper and a space-free `/opt/deep-dark-dungeons-hol` installation, plus a static-runtime AppImage, with a small installer script that verifies the release checksums, copies it to a stable writable filename and creates a menu shortcut. Both keep Electron sandboxing enabled. Restricted Ubuntu AppImage installations need the root-owned mode-4755 sandbox helper supplied by a system Chrome/Chromium installation; the packaged launcher checks this before starting Electron. No global kernel settings are changed. Windows releases are currently unsigned.

`electron-updater` reads the packaged GitHub provider configuration. Only stable newer versions are accepted; downgrade and prerelease updates are disabled. Checks run after the save bridge is ready, every four hours, and on demand. Downloads run in the background with SHA-512 validation against the release metadata. The main process accepts only fixed update commands from the trusted main frame. Release text is not executed or rendered as HTML. The renderer cannot choose a feed, file or executable.

Installation is explicit. **Save & restart to install** sends the existing native-close save request. Only a successful disk-save acknowledgement invokes `quitAndInstall`; a save failure retains the downloaded update and reports the error. Automatic install-on-quit is disabled. The application name, app ID and save directory remain stable. Local unpacked/development builds show a release-download link instead of claiming they can self-update. Source checkout launches remain useful for development; install the AppImage or Debian package to use release updates.

## Publishing

1. Use a `codex/` branch. Increment `package.json` and the lockfile, update `docs/release-notes.md`, and run rules tests, the native launcher suite, installer smoke tests and the update round-trip check.
2. Open a PR, review the diff and passing checks, then merge. The installer workflow builds Linux and Windows on their native runners and exercises the AppImage, installed Debian package and installed Windows executable before uploading CI artifacts.
3. Tag the merged commit `v<package version>` and push the tag using the project-scoped personal GitHub wrapper. The workflow verifies that tag/version agree, rebuilds both platforms, and runs their checks.
4. Only after both platforms pass, the publishing job creates a draft release, uploads all installers, blockmaps, update metadata and SHA256SUMS, then publishes it as latest. This avoids exposing a feed whose installer has not uploaded yet.
5. Verify the public release assets and live update check. Do not replace a published installer in place; corrections get a new version/tag.

Local commands: `npm run package:linux`, `npm run package:windows`; `npm run package:dir` retains the development launcher target. Build platforms sequentially when using the same checkout because Vite's output directory is shared. `node scripts/release-check.mjs <AppImage-or-installed-exe>` checks real rendering, saves and update IPC with isolated data; Linux also checks seccomp and the unconfined terminal AppArmor context. Tests must never use a real player save directory.
