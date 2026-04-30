#!/usr/bin/env bash
# Cloudflare Pages build script.
# Builds every app under apps/* that has a build script in its package.json.
# Outputs to apps/<name>/dist/ which is served via _redirects rules.
set -e
echo "--- boomer-counselor build start: $(date -u) ---"
for d in apps/*/; do
  if [ -f "$d/package.json" ] && grep -q '"build"' "$d/package.json"; then
    name=$(basename "$d")
    echo ""
    echo "=== building $name ==="
    (cd "$d" && npm install --no-audit --no-fund && npm run build)
  fi
done
echo ""
echo "--- build complete ---"
