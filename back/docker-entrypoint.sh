#!/bin/sh
# Apply the pending migrations, then start the server. Nothing else: the app
# holds no reference data to seed, only the accounts and profiles its users
# create themselves.
#
# The binary is called straight from node_modules rather than through
# `pnpm db:migrate`. Going through pnpm made the container fetch corepack's
# pnpm over the network at every boot and then reinstall all 604 packages —
# "Recreating /app/node_modules" — which on a 512 MB instance runs it out of
# memory and, when it does not, takes long enough for the deploy to time out.
# The image already carries the dependency tree; nothing needs installing.
set -e

echo "[menu-back] applying database migrations..."
./node_modules/.bin/drizzle-kit migrate

echo "[menu-back] starting: $*"
exec "$@"
