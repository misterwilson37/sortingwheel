#!/bin/bash
# Fails loudly on: non-zero exit, a *** marker, OR no output at all.
# The last one matters — a test that throws on import produces no ***
# and used to be counted as a pass.
fail=0
cd "$(dirname "$0")"
for f in test_v16.js test_extra.js test_counts.js test_retry.js test_anim.js \
         test_fac2.js test_summary.js test_glyph.js test_hold.js test_pending.js test_xglyph.js test_confirm.js \
         test_noshow.js test_ticks.js; do
  out=$(node "$f" 2>&1); code=$?
  marks=$(printf '%s' "$out" | grep -c '\*\*\*')
  passes=$(printf '%s' "$out" | grep -c 'PASS\|OK\|resolved')
  lines=$(printf '%s' "$out" | wc -l)
  if   [ $code -ne 0 ];      then echo "  $f  DIED (exit $code)"; fail=1
  elif [ "$marks" -gt 0 ];   then echo "  $f  *** $marks failure(s)"; fail=1
  elif [ "$lines" -lt 3 ];   then echo "  $f  SUSPICIOUS (only $lines lines)"; fail=1
  elif [ "$passes" -eq 0 ];  then echo "  $f  NO ASSERTIONS RAN"; fail=1
  else echo "  $f  pass ($passes checks, $lines lines)"; fi
done
[ $fail -eq 0 ] && echo "ALL SUITES GREEN" || echo "SUITE FAILURES ABOVE"
exit $fail
