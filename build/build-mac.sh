#!/usr/bin/env bash
# Build FloatingTodo v1.4.1 for macOS (minimal repo layout: ../app + ./build)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
SRC="$(cd "$ROOT/../app" && pwd)"
BUILD="$ROOT/build"
ICON_SRC="$SRC/assets/logo.png"

echo "==> Source: $SRC"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "Error: macOS build must run on a Mac (or GitHub Actions macos-14)."
  exit 1
fi

icon_size() { stat -f%z "$1" 2>/dev/null || stat -c%s "$1"; }

if [[ ! -f "$ICON_SRC" ]] || [[ $(icon_size "$ICON_SRC") -lt 1024 ]]; then
  echo "==> Regenerating icons..."
  (cd "$ROOT" && npm install sharp png2icons --no-save 2>/dev/null; node scripts/generate-icons.mjs)
fi

mkdir -p "$BUILD"

if [[ ! -f "$BUILD/icon.icns" ]]; then
  ICONSET="$BUILD/icon.iconset"
  rm -rf "$ICONSET"
  mkdir -p "$ICONSET"
  echo "==> Generating icon.icns..."
  for size in 16 32 128 256 512; do
    sips -z "$size" "$size" "$ICON_SRC" --out "$ICONSET/icon_${size}x${size}.png" >/dev/null
    d=$((size * 2))
    sips -z "$d" "$d" "$ICON_SRC" --out "$ICONSET/icon_${size}x${size}@2x.png" >/dev/null
  done
  iconutil -c icns "$ICONSET" -o "$BUILD/icon.icns"
fi

echo "==> Building with electron-builder..."
cd "$ROOT"
export CSC_IDENTITY_AUTO_DISCOVERY=false
npx --yes electron-builder@24.13.3 --mac dmg zip --arm64 --x64

echo ""
ls -lh "$ROOT"/FloatingTodo-v*-mac-*.{dmg,zip} 2>/dev/null || true
