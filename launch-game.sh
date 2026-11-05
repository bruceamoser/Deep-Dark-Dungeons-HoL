#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "$0")"
# Keep Chromium's sandbox enabled, including on Ubuntu systems that restrict
# unprivileged user namespaces. Reject stale inherited overrides and use only a
# root-owned, setuid executable. Never chmod a project-owned binary setuid.
if [[ "$(uname -s)" == Linux ]]; then
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
      printf '%s\n' 'Deep Dark Dungeons: no usable system Chromium sandbox helper was found.' 'Install Google Chrome or Chromium with its sandbox helper, then run this launcher again.' >&2
      exit 1
    fi
  fi
fi
if [[ -x release/linux-unpacked/deep-dark-dungeons-hol ]]; then
  exec release/linux-unpacked/deep-dark-dungeons-hol "$@"
fi
npm run build
exec npm start -- "$@"
