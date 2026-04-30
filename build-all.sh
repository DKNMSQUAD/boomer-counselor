#!/usr/bin/env bash
# Build script run by Cloudflare Pages on every push.
# Builds every app under apps/ that has a package.json, in series.
set -e

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
echo "Building from $REPO_ROOT"

for app_dir in "$REPO_ROOT"/apps/*/; do
  app_name="$(basename "$app_dir")"
  if [ -f "$app_dir/package.json" ]; then
    echo "---- Building $app_name ----"
    cd "$app_dir"
    npm install --no-audit --no-fund --prefer-offline
    npm run build
    cd "$REPO_ROOT"
  else
    echo "---- Skipping $app_name (no package.json) ----"
  fi
done

echo "---- All apps built ----"
