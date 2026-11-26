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

# The other accounts of the site, written straight to the tables: the signed-in readers own a
# small share of every table, which is what the planner meets in production.
psql "$database" -v ON_ERROR_STOP=1 -q <<'SQL'
INSERT INTO "user" (id, email, password_hash, email_verified_at)
SELECT gen_random_uuid(), 'crowd-' || n || '@crowd.example', 'x', now()
FROM generate_series(1, 300) AS n;
INSERT INTO "weight" (id, user_id, date, kg)
SELECT gen_random_uuid(), u.id, date '2015-01-01' + d, 60 + d % 30
FROM "user" u, generate_series(1, 10) AS d WHERE u.email LIKE 'crowd-%';
INSERT INTO "custom_food" (id, user_id, name, kcal, protein, fat, carbs, fiber, price_per_kg)
SELECT gen_random_uuid(), u.id, 'Food ' || d, 100, 10, 5, 10, 2, 5
FROM "user" u, generate_series(1, 6) AS d WHERE u.email LIKE 'crowd-%';
INSERT INTO "custom_recipe" (id, user_id, name, slot, ingredients, steps, prep_minutes)
SELECT gen_random_uuid(), u.id, 'Recipe ' || d, 'MAIN', '{}'::jsonb, '[]'::jsonb, 10
FROM "user" u, generate_series(1, 4) AS d WHERE u.email LIKE 'crowd-%';
SQL
