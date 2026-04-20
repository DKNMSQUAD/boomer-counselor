#!/bin/bash
# Assemble the unified native bundle for Capacitor.
# Output: dist-native/ at repo root with hub + all 3 tools.
# Safe to run repeatedly. Does not touch web deploy.

set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
OUT="$ROOT/dist-native"

echo "==> Cleaning $OUT"
rm -rf "$OUT"
mkdir -p "$OUT"

echo "==> Building careers"
(cd "$ROOT/apps/careers" && npm install --silent && npm run build)

echo "==> Building profile"
(cd "$ROOT/apps/profile" && npm install --silent && npm run build)

echo "==> Building college-search"
(cd "$ROOT/apps/college-search" && npm install --silent && npm run build)

echo "==> Assembling dist-native"
# Hub shell
cp "$ROOT/index.html" "$OUT/"
cp "$ROOT/logo.png"    "$OUT/" 2>/dev/null || true
cp "$ROOT/side.png"    "$OUT/" 2>/dev/null || true
cp "$ROOT/privacy.html" "$OUT/" 2>/dev/null || true
cp "$ROOT/terms.html"   "$OUT/" 2>/dev/null || true

# Tools under matching path prefixes (their Vite bases: /careers/, /profile/, /college-search/)
mkdir -p "$OUT/careers" "$OUT/profile" "$OUT/college-search"
cp -R "$ROOT/apps/careers/dist/"        "$OUT/careers/"
cp -R "$ROOT/apps/profile/dist/"        "$OUT/profile/"
cp -R "$ROOT/apps/college-search/dist/" "$OUT/college-search/"

echo "==> dist-native ready ($(du -sh "$OUT" | cut -f1))"
