#!/bin/sh
# menu — o2switch self-deploy (back).
#
# Run by cron every few minutes. It PULLS main and redeploys when the branch
# advanced, so nothing ever connects INTO o2switch: no SSH from a runner, no IP to
# authorise in the firewall, no manual reconnection. The front deploys separately
# on Netlify (see .github/workflows/deploy-front.yml).
#
# Migrations are NOT auto-applied: prod's drizzle journal was populated by hand
# via psql (9.6-safe tables), so `drizzle-kit migrate` could try to replay them.
# So when a new commit ADDS a migration, this script parks (logs it, deploys
# nothing) until the migration is applied by hand and the clone advanced past it —
# code-only commits keep auto-deploying. Migrations are rare.
#
# One-time setup on the server — see ops/README.md.
set -eu

REPO_DIR="$HOME/menu"                  # monorepo clone (this file lives in it)
APP_DIR="$HOME/apps/menu-back"         # the Passenger app root (unchanged)
NODEENV="$HOME/nodevenv/apps/menu-back/24/bin/activate"
BRANCH=main
LOCK="$HOME/.menu-deploy.lock"

# Never let two cron ticks overlap a deploy.
exec 9>"$LOCK"
flock -n 9 || exit 0

cd "$REPO_DIR"
git fetch --quiet origin "$BRANCH"
OLD=$(git rev-parse HEAD)
NEW=$(git rev-parse "origin/$BRANCH")
[ "$OLD" = "$NEW" ] && exit 0 # nothing new

echo "$(date -u +%FT%TZ) new commits $OLD..$NEW"

# A new migration needs a hand-applied psql step first. Park (don't touch prod)
# until it's applied and the clone advanced past that commit by the manual deploy.
if git diff --name-only "$OLD" "$NEW" -- back/infrastructure/database/migrations \
    | grep -q '\.sql$'; then
  echo "!! migration in $OLD..$NEW — apply it by hand, then advance the clone. Parking."
  exit 0
fi

git reset --hard "$NEW"
# Mirror the source into the running app dir, keeping installed deps, secrets and
# the build/runtime dirs.
rsync -a --delete \
  --exclude=node_modules --exclude=.env --exclude=tmp \
  --exclude=dist --exclude=public \
  "$REPO_DIR/back/" "$APP_DIR/"

# shellcheck disable=SC1090
. "$NODEENV"
cd "$APP_DIR"
corepack pnpm install --frozen-lockfile
corepack pnpm exec nest build
touch "$APP_DIR/tmp/restart.txt"
echo "$(date -u +%FT%TZ) deployed $NEW"
