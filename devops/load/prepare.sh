#!/usr/bin/env bash
# Empties the database and opens the accounts a load run signs in with, before every profile.
# Usage: prepare.sh <api url> <psql connection string>
#
# A verification link is only ever mailed, so the accounts are registered through the API (the
# real code path) and then marked verified in the database. The emails and the password must
# match seed.ts.
set -euo pipefail
api=$1
database=$2
password=${LOAD_PASSWORD:-a-long-enough-password}
pool=${DISPOSABLE_ACCOUNTS:-600}

psql "$database" -v ON_ERROR_STOP=1 -q \
  -c 'TRUNCATE TABLE "profile", "user", "grocery_product" RESTART IDENTITY CASCADE'

register() {
  curl --silent --show-error --fail --output /dev/null \
    --header 'content-type: application/json' \
    --data "{\"email\":\"$1\",\"password\":\"$password\"}" \
    "$api/auth/register"
}

for name in admin reader claimer finisher reporter; do
  register "$name@load.example"
done
# One per call of the operation that deletes an account: an account can only be deleted once.
for index in $(seq 1 "$pool"); do
  register "disposable-$index@load.example"
done

psql "$database" -v ON_ERROR_STOP=1 -q \
  -c "UPDATE \"user\" SET email_verified_at = now() WHERE email LIKE '%@load.example'"
