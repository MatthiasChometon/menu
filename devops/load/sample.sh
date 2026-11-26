#!/usr/bin/env bash
# Every five seconds, until the process exits: seconds since start, resident memory (MB) and the
# CPU it used over those five seconds (%, 100 = one full core). Usage: sample.sh <pid> <csv>
set -u
pid=$1
out=$2
interval=5
ticks_per_second=$(getconf CLK_TCK)

cpu_ticks() { awk '{ print $14 + $15 }' "/proc/$pid/stat"; }

echo 'seconds,rss_mb,cpu_percent' > "$out"
start=$(date +%s)
previous=$(cpu_ticks)
while sleep "$interval" && kill -0 "$pid" 2>/dev/null; do
  current=$(cpu_ticks)
  rss_kb=$(awk '/^VmRSS:/ { print $2 }' "/proc/$pid/status")
  echo "$(( $(date +%s) - start )),$(( rss_kb / 1024 )),$(( (current - previous) * 100 / (ticks_per_second * interval) ))" >> "$out"
  previous=$current
done
