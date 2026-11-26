-- The ten statements that cost the most time during a run, for the run's summary.
-- Needs pg_stat_statements (see the workflow), reset before the run.
SELECT
  to_char(total_exec_time, 'FM999999990') AS total_ms,
  calls,
  to_char(mean_exec_time, 'FM999990.00') AS mean_ms,
  to_char(max_exec_time, 'FM999990.00') AS max_ms,
  left(regexp_replace(query, '\s+', ' ', 'g'), 110) AS statement
FROM pg_stat_statements
WHERE query NOT ILIKE '%pg_stat_statements%'
ORDER BY total_exec_time DESC
LIMIT 10;
