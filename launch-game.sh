#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "$0")"
# Keep Chromium's sandbox enabled, including on Ubuntu systems that restrict
# unprivileged user namespaces. Reject stale inherited overrides and use only a
# root-owned, setuid executable. Never chmod a project-owned binary setuid.
if [[ "$(uname -s)" == Linux ]]; then
  if [[ ! -x release/linux-unpacked/deep-dark-dungeons-hol ]]; then
    npm run package:linux
  fi
  game_sandbox_helper=""
  for game_candidate in "${CHROME_DEVEL_SANDBOX:-}" /opt/google/chrome/chrome-sandbox /usr/lib/chromium/chrome-sandbox; do
    if [[ -n "$game_candidate" && -x "$game_candidate" && "$(stat -Lc '%u:%a' "$game_candidate")" == 0:4755 ]]; then
      game_sandbox_helper="$(readlink -f -- "$game_candidate")"
      break
    fi
  done
  if [[ -n "$game_sandbox_helper" ]]; then
    export CHROME_DEVEL_SANDBOX="$game_sandbox_helper"
    # Also repair the packaged default path: direct launches and inherited
    # Chromium settings then resolve the same trusted system-owned helper.
    if [[ -d release/linux-unpacked && -w release/linux-unpacked ]]; then
      ln -sfn -- "$game_sandbox_helper" release/linux-unpacked/chrome-sandbox
    fi
  else
    unset CHROME_DEVEL_SANDBOX
    if [[ -r /proc/sys/kernel/apparmor_restrict_unprivileged_userns && "$(cat /proc/sys/kernel/apparmor_restrict_unprivileged_userns)" == 1 ]]; then
      printf '%s\n' 'Four Lanterns Deep: no usable system Chromium sandbox helper was found.' 'Install Google Chrome or Chromium with its sandbox helper, then run this launcher again.' >&2
      exit 1
    fi
  fi
  # Chromium's SUID zygote launch can split executable paths at spaces under
  # Ubuntu's ordinary terminal AppArmor context (electron/electron#44414).
  # Use an actual private runtime copy: a symlink to the spaced path is not enough.
  game_runtime_root="${XDG_DATA_HOME:-$HOME/.local/share}/deep-dark-dungeons-hol/runtimes"
  if [[ "$game_runtime_root" =~ [[:space:]] ]]; then
    game_runtime_root="${XDG_RUNTIME_DIR:-/tmp}/deep-dark-dungeons-hol-$UID"
  fi
  if [[ "$game_runtime_root" =~ [[:space:]] || -L "$game_runtime_root" ]]; then
    printf '%s\n' 'Four Lanterns Deep needs a private runtime directory without spaces.' >&2
    exit 1
  fi
  mkdir -p -- "$game_runtime_root"
  if [[ "$(stat -c '%u' "$game_runtime_root")" != "$UID" ]]; then
    printf '%s\n' 'The game runtime directory must belong to your user.' >&2
    exit 1
  fi
  chmod 700 -- "$game_runtime_root"
  game_build_id="$(sha256sum release/linux-unpacked/resources/app.asar release/linux-unpacked/deep-dark-dungeons-hol | sha256sum | cut -c1-20)"
  game_runtime="$game_runtime_root/$game_build_id"
  exec {game_install_lock}>"$game_runtime_root/install.lock"
  flock "$game_install_lock"
  if [[ ! -x "$game_runtime/deep-dark-dungeons-hol" ]]; then
    game_staging="$(mktemp -d "$game_runtime_root/.stage-XXXXXX")"
    trap 'rm -rf -- "$game_staging"' EXIT
    cp -a --reflink=auto -- release/linux-unpacked/. "$game_staging/"
    mv -- "$game_staging" "$game_runtime"
    trap - EXIT
  fi
  if [[ -n "$game_sandbox_helper" ]]; then
    ln -sfn -- "$game_sandbox_helper" "$game_runtime/chrome-sandbox"
  fi
  flock -u "$game_install_lock"
  exec {game_install_lock}>&-
  exec "$game_runtime/deep-dark-dungeons-hol" "$@"
fi
npm run build
exec npm start -- "$@"
