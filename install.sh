#!/bin/sh
set -eu
ROOT="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
PREFIX="${PREFIX:-/usr/local}"
DEST="$PREFIX/share/world3d"
BIN="$PREFIX/bin"
APPS="$PREFIX/share/applications"
install -d "$DEST/locales" "$DEST/assets/fonts" "$BIN" "$APPS"
install -m 644 "$ROOT/world3d.py" "$DEST/world3d.py"
install -m 644 "$ROOT"/locales/*.json "$DEST/locales/"
if [ -d "$ROOT/assets/fonts" ]; then cp -R "$ROOT/assets/fonts/." "$DEST/assets/fonts/"; fi
cat > "$BIN/world3d" <<EOF
#!/bin/sh
exec python3 "$DEST/world3d.py" "\$@"
EOF
chmod 755 "$BIN/world3d"
cat > "$APPS/world3d.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=World3D
Comment=Editor 3D per Linux
Exec=$BIN/world3d
Terminal=false
Categories=Graphics;3DGraphics;
StartupNotify=true
EOF
printf 'World3D installato in %s\n' "$DEST"
