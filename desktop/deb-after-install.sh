#!/usr/bin/env bash
set -euo pipefail
# Debian owns this installation. Use a space-free /opt path and the packaged
# Chromium helper, so Chrome is not a prerequisite for the .deb distribution.
game_root=/opt/deep-dark-dungeons-hol
update-alternatives --install /usr/bin/deep-dark-dungeons-hol deep-dark-dungeons-hol "$game_root/deep-dark-dungeons-hol" 100
chown root:root "$game_root/chrome-sandbox"
chmod 4755 "$game_root/chrome-sandbox"
if command -v update-desktop-database >/dev/null; then update-desktop-database /usr/share/applications || true; fi
