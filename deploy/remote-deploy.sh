#!/usr/bin/env bash
# Runs ON THE VPS (piped over SSH by the deploy workflows).
# Expects: DIR, SHA, PM2_NAME, ADMIN_API_URL; optional PORT (else backend/.env decides)
# The server checkout must already exist at $DIR with backend/.env in place.
set -euo pipefail
[ -n "${DIR:-}" ] && [ -d "$DIR/.git" ] || { echo "DIR ($DIR) is not a git checkout on this server"; exit 1; }
cd "$DIR"

echo "==> Checking out $SHA"
git fetch --quiet origin
git checkout --quiet --force "$SHA"

echo "==> Backend"
cd "$DIR/backend"
if [ -n "${PORT:-}" ]; then export PORT; else unset PORT; fi
npm ci --no-audit --no-fund
npx prisma generate
npm run build
npx prisma migrate deploy
export NODE_ENV=production   # set after npm ci so devDependencies (tsc, prisma) install
if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
  pm2 reload "$PM2_NAME" --update-env
else
  pm2 start dist/server.js --name "$PM2_NAME" --cwd "$DIR/backend"
fi
pm2 save

echo "==> Admin panel"
cd "$DIR/admin-panel"
npm ci --no-audit --no-fund
VITE_API_URL="$ADMIN_API_URL" npm run build   # nginx serves $DIR/admin-panel/dist

echo "==> Done ($SHA)"
