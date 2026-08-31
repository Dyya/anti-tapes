#!/usr/bin/env bash
# Anti dev server: build the package and serve the repository, so the
# examples (which import anti-tapes over a bare specifier) can run.
# No dependencies. Usage: ./serve.sh [port]   (default 8477)

PORT="${1:-8477}"
ROOT="$(cd "$(dirname "$0")" && pwd)"

if command -v node >/dev/null 2>&1; then
  node "$ROOT/tools/build-package.js" >/dev/null 2>&1 \
    && echo "Built the package (dist/)" \
    || echo "Package build failed: the examples will not run"
else
  echo "No node found: the examples will not run"
fi

if curl -so /dev/null "http://localhost:$PORT/"; then
  echo "Server already running on $PORT"
else
  ( cd "$ROOT" && python3 -m http.server "$PORT" >/dev/null 2>&1 & )
  sleep 1
  echo "Started server on $PORT (stop with: pkill -f \"http.server $PORT\")"
fi

echo "Examples: http://localhost:$PORT/examples/"
open "http://localhost:$PORT/examples/" 2>/dev/null || true
