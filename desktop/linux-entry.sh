#!/usr/bin/env bash
set -euo pipefail
game_app_dir="$(dirname -- "$(readlink -f -- "${BASH_SOURCE[0]}")")"
# AppImage mounts are read-only. Reuse only a trusted, installed sandbox helper.
game_helper=""
for candidate in "$game_app_dir/chrome-sandbox" "${CHROME_DEVEL_SANDBOX:-}" /opt/google/chrome/chrome-sandbox /usr/lib/chromium/chrome-sandbox /usr/lib/chromium-browser/chrome-sandbox; do
  if [[ -n "$candidate" && -f "$candidate" && "$(stat -Lc '%u:%a' -- "$candidate")" == "0:4755" ]]; then
    game_helper="$candidate"
    break
  fi
done
if [[ -n "$game_helper" ]]; then
  export CHROME_DEVEL_SANDBOX="$game_helper"
else
  unset CHROME_DEVEL_SANDBOX
  if [[ -r /proc/sys/kernel/apparmor_restrict_unprivileged_userns && "$(cat /proc/sys/kernel/apparmor_restrict_unprivileged_userns)" == 1 ]]; then
    message='Four Lanterns Deep needs the sandbox helper from Google Chrome or Chromium on this Ubuntu system. Install Chrome or Chromium, then launch the game again. Sandboxing remains enabled.'
    printf '%s\n' "$message" >&2
    if command -v zenity >/dev/null; then zenity --error --text="$message" || true; fi
    exit 1
  fi
fi
if [[ -n "${APPIMAGE:-}" && -n "$game_helper" ]]; then
  # Chromium requires the helper beside its executable; the AppImage mount
  # cannot contain a setuid helper. Stage a private, space-free runtime and link
  # the trusted system helper, as the source launcher does. Keep APPIMAGE set so
  # electron-updater replaces the original image, not this disposable cache.
  game_runtime_root="${XDG_DATA_HOME:-$HOME/.local/share}/deep-dark-dungeons-hol/runtimes"
  if [[ "$game_runtime_root" =~ [[:space:]] ]]; then
    game_runtime_root="${XDG_RUNTIME_DIR:-/tmp}/deep-dark-dungeons-hol-$UID"
  fi
  if [[ "$game_runtime_root" =~ [[:space:]] || -L "$game_runtime_root" ]]; then exit 1; fi
  mkdir -p -- "$game_runtime_root"
  if [[ "$(stat -c '%u' -- "$game_runtime_root")" != "$UID" ]]; then exit 1; fi
  chmod 700 -- "$game_runtime_root"
  game_build_id="$(sha256sum "$game_app_dir/resources/app.asar" "$game_app_dir/deep-dark-dungeons-hol.bin" | cut -d ' ' -f 1 | sha256sum | cut -c1-20)"
  game_runtime="$game_runtime_root/appimage-$game_build_id"
  exec {game_install_lock}>"$game_runtime_root/install.lock"
  flock "$game_install_lock"
  if [[ ! -x "$game_runtime/deep-dark-dungeons-hol.bin" ]]; then
    game_staging="$(mktemp -d "$game_runtime_root/.stage-XXXXXX")"
    trap 'rm -rf -- "$game_staging"' EXIT
    cp -a --reflink=auto -- "$game_app_dir/." "$game_staging/"
    mv -- "$game_staging" "$game_runtime"
    trap - EXIT
  fi
  ln -sfn -- "$game_helper" "$game_runtime/chrome-sandbox"
  flock -u "$game_install_lock"
  exec {game_install_lock}>&-
  game_app_dir="$game_runtime"
fi
exec "$game_app_dir/deep-dark-dungeons-hol.bin" "$@"
