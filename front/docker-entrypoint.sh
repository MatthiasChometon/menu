#!/bin/sh
# The type generation introspects the live GraphQL API, so wait for the back to
# answer before installing / building. Dependencies live in a named volume, so
# the install and the prod build only really run on the first boot.
set -e

WAIT_URL="${GQL_HOST:-http://back:3779/graphql}"
echo "[menu-front] waiting for the GraphQL API at ${WAIT_URL}..."
until node -e "require('http').get('${WAIT_URL}', () => process.exit(0)).on('error', () => process.exit(1))" 2>/dev/null; do
  sleep 2
done
echo "[menu-front] GraphQL API reachable."

if [ ! -d node_modules ] || [ -z "$(ls -A node_modules 2>/dev/null)" ]; then
  echo "[menu-front] installing dependencies..."
  # --prod=false: the prod image sets NODE_ENV=production, but the Nuxt build
  # needs the devDependencies (the PWA module, vue-tsc, ...).
  pnpm install --frozen-lockfile --prod=false
fi

# Check the built entry file, not the .output directory: a mounted volume makes
# .output exist (empty) on first boot, which would skip the build and crash.
if [ "$MODE" = "prod" ] && [ ! -f .output/server/index.mjs ]; then
  echo "[menu-front] building for production..."
  pnpm build
fi

echo "[menu-front] starting: $*"
exec "$@"
