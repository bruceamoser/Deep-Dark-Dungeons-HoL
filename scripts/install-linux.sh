#!/usr/bin/env bash
set -euo pipefail
# Download this script, the AppImage, PNG and SHA256SUMS from the same release.
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
shopt -s nullglob
images=(Deep-Dark-Dungeons-HoL-*.AppImage)
if [[ ${#images[@]} != 1 || ! -f SHA256SUMS || ! -f four-lanterns-icon-v2.png ]]; then
  printf '%s\n' 'Place install-linux.sh, one release AppImage, four-lanterns-icon-v2.png and SHA256SUMS in the same folder, then run: bash install-linux.sh' >&2
  exit 1
fi
sha256sum --check --ignore-missing SHA256SUMS
game_image="${images[0]}"
# Stable filename lets the updater replace the image without breaking shortcuts.
game_dir="${XDG_DATA_HOME:-$HOME/.local/share}/deep-dark-dungeons-hol"
mkdir -p -- "$game_dir" "${XDG_DATA_HOME:-$HOME/.local/share}/applications"
install -m 755 -- "$game_image" "$game_dir/.installing.AppImage"
mv -f -- "$game_dir/.installing.AppImage" "$game_dir/Deep-Dark-Dungeons-HoL.AppImage"
install -m 644 -- four-lanterns-icon-v2.png "$game_dir/icon.png"
# Escape quoted desktop Exec fields (including literal percent field codes).
desktop_path="${game_dir//\\/\\\\}"
desktop_path="${desktop_path//\"/\\\"}"
desktop_path="${desktop_path//\$/\\\$}"
desktop_path="${desktop_path//\`/\\\`}"
desktop_path="${desktop_path//%/%%}"
cat > "${XDG_DATA_HOME:-$HOME/.local/share}/applications/deep-dark-dungeons-hol.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Four Lanterns Deep
Comment=Four heroes. Four lanterns. Endless depths.
Exec="$desktop_path/Deep-Dark-Dungeons-HoL.AppImage"
Icon=$game_dir/icon.png
Terminal=false
Categories=Game;RolePlaying;
StartupWMClass=deep-dark-dungeons-hol
EOF
printf 'Installed. Open Four Lanterns Deep from your applications menu.\nOr run: "%s/Deep-Dark-Dungeons-HoL.AppImage"\n' "$game_dir"
