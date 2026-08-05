#!/bin/sh
# Apply the pending migrations, then start the server. Nothing else: the app
# holds no reference data to seed, only the accounts and profiles its users
# create themselves.
set -e

echo "[menu-back] applying database migrations..."
pnpm db:migrate

echo "[menu-back] starting: $*"
exec "$@"
