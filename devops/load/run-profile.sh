#!/usr/bin/env bash
# Plays one profile against a fresh API process, as the shared host would run it: one core and
# 512 MB of heap. Usage: run-profile.sh <profile>
# Needs REPORTS (where the reports go), DATABASE_URL and API_URL in the environment, the API built
# in back/dist and the database migrated.
set -uo pipefail
profile=$1
here=$(cd "$(dirname "$0")" && pwd)
: "${REPORTS:?}" "${DATABASE_URL:?}" "${API_URL:?}"
summary=${GITHUB_STEP_SUMMARY:-/dev/null}
mkdir -p "$REPORTS"

# --- the API, alone on the first core ---------------------------------------------------------
(cd "$here/../../back" && exec taskset -c 0 node --max-old-space-size=512 dist/main) \
  > "$REPORTS/api-$profile.log" 2>&1 &
api_pid=$!

ready=false
for _ in $(seq 60); do
  if curl --silent --fail "$API_URL/health/ready" > /dev/null; then ready=true; break; fi
  sleep 1
done
if [ "$ready" != true ]; then
  cat "$REPORTS/api-$profile.log"
  kill "$api_pid" 2> /dev/null
  exit 1
fi

# --- a known database, then the run -----------------------------------------------------------
"$here/prepare.sh" "$API_URL" "$DATABASE_URL" || { kill "$api_pid"; exit 1; }
# The statistics are part of the report: without them the run is not valid, so this stops it.
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -c 'SELECT pg_stat_statements_reset()' > /dev/null \
  || { echo 'pg_stat_statements is not available: see the workflow step that turns it on.'; kill "$api_pid"; exit 1; }

"$here/sample.sh" "$api_pid" "$REPORTS/api-$profile-resources.csv" &
sampler_pid=$!

# The database holds the second core (see the workflow) and k6 gets the others, so what it spends
# never comes out of the API's or the database's.
status=0
(cd "$here" && SUMMARY_DIR="$REPORTS" taskset -c "2-$(( $(nproc) - 1 ))" \
  k6 run --quiet -e PROFILE="$profile" api.ts) || status=$?

# The breakpoint run ends by crossing a threshold on purpose, so k6's exit code says nothing:
# the verdict is whether the floor was held.
if [ "$profile" = breakpoint ]; then
  if [ "$(cat "$REPORTS/api-breakpoint.verdict" 2> /dev/null)" = pass ]; then status=0; else status=1; fi
fi

# --- what to read afterwards ------------------------------------------------------------------
{
  if [ -s "$REPORTS/api-$profile.md" ]; then
    cat "$REPORTS/api-$profile.md"
  else
    echo "### No report for \`$profile\` (k6 exited with $status)"
  fi
  echo
  if [ -s "$REPORTS/api-$profile-resources.csv" ]; then
    awk -F, -f "$here/resources.awk" "$REPORTS/api-$profile-resources.csv"
    echo
  fi
  echo '### Ten slowest statements (total time)'
  echo
  echo '| Total | Calls | Mean | Max | Statement |'
  echo '| --- | --- | --- | --- | --- |'
  if slowest=$(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --no-align --tuples-only \
    --field-separator ' | ' -f "$here/slow-statements.sql") && [ -n "$slowest" ]; then
    echo "$slowest" | sed -e 's/^/| /' -e 's/$/ |/'
  else
    echo '| ERROR | the statistics are empty or could not be read | | | |'
    status=1
  fi
  echo
} >> "$summary"

kill "$sampler_pid" "$api_pid" 2> /dev/null
wait "$api_pid" 2> /dev/null
if grep -qiE '\b(error|fatal)\b' "$REPORTS/api-$profile.log"; then
  echo "The API log of \`$profile\` holds errors: see the load-replica artifact." >> "$summary"
fi

exit "$status"
