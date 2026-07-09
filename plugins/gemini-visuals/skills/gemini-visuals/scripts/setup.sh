#!/usr/bin/env bash
# Make the ESM helper scripts runnable: Playwright must be resolvable from the
# scripts dir. IMPORTANT: NODE_PATH does NOT work for ESM `import` — you need a
# real (or symlinked) node_modules next to the scripts. This creates one.
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"

if [ -d "$DIR/node_modules/playwright" ]; then
  echo "playwright already present in $DIR/node_modules"
else
  # Prefer symlinking an existing install from the npx/npm cache (fast, no download).
  FOUND=""
  for d in /root/.npm/_npx/*/node_modules ./node_modules ../node_modules; do
    [ -d "$d/playwright" ] && FOUND="$(cd "$d" && pwd)" && break
  done
  if [ -n "$FOUND" ]; then
    ln -sfn "$FOUND" "$DIR/node_modules"
    echo "linked node_modules -> $FOUND"
  else
    echo "installing playwright locally in $DIR ..."
    ( cd "$DIR" && npm init -y >/dev/null 2>&1 && npm install playwright >/dev/null 2>&1 )
  fi
fi

# Ensure the chromium browser binary exists.
( cd "$DIR" && npx --no-install playwright install chromium >/dev/null 2>&1 ) || \
  ( cd "$DIR" && npx playwright install chromium ) || true

if [ -z "$GEMINI_API_KEY" ]; then
  echo "WARNING: GEMINI_API_KEY is not set. export it before running gemini-image.mjs / gemini-review.mjs."
fi
echo "setup done. Run the .mjs scripts from: $DIR"
