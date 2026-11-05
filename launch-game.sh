#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "$0")"
# Ubuntu may restrict user namespaces for unpacked Electron builds. Reuse a
# system-installed SUID helper for this process rather than disable sandboxing.
if [[ "$(uname -s)" == Linux && -z "${CHROME_DEVEL_SANDBOX:-}" ]]; then
  for game_sandbox_helper in /opt/google/chrome/chrome-sandbox /usr/lib/chromium/chrome-sandbox; do
    if [[ -x "$game_sandbox_helper" && "$(stat -Lc '%u:%a' "$game_sandbox_helper")" == 0:4755 ]]; then
      export CHROME_DEVEL_SANDBOX="$game_sandbox_helper"
      break
    fi
  done
fi
if [[ -x release/linux-unpacked/deep-dark-dungeons-hol ]]; then
  exec release/linux-unpacked/deep-dark-dungeons-hol "$@"
fi
npm run build
exec npm start -- "$@"
