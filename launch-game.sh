#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "$0")"
if [[ -x release/linux-unpacked/deep-dark-dungeons-hol ]]; then
  exec release/linux-unpacked/deep-dark-dungeons-hol "$@"
fi
npm run build
exec npm start -- "$@"
