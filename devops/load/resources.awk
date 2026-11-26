# Sums up sample.sh's CSV as a Markdown table: memory at the start, at the end, at its highest,
# and the busiest five seconds of CPU. Memory that ends far above where it started, run after
# run, is a leak.
NR == 2 { first = $2 }
NR > 1 {
  last = $2
  if ($2 > rss) rss = $2
  if ($3 > cpu) cpu = $3
}
END {
  print "### API process"
  print ""
  print "| Memory at the start | at the end | at its highest | Peak CPU (100 % = one core) |"
  print "| --- | --- | --- | --- |"
  printf "| %d MB | %d MB | %d MB | %d %% |\n", first, last, rss, cpu
}
