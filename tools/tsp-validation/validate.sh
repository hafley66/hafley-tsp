#!/usr/bin/env bash
# Validate TSP assumptions used by the polyglot intent compiler design.
# Run from repo root: bash tools/tsp-validation/validate.sh

set -uo pipefail
cd "$(dirname "$0")"

PASS=0
FAIL=0

run_fixture() {
  local file="$1"
  local name
  name=$(basename "$file" .tsp)

  if npx tsp compile "$file" --no-emit 2>&1 | grep -q "error"; then
    echo "  FAIL  $name"
    ((FAIL++))
  else
    echo "  PASS  $name"
    ((PASS++))
  fi
}

echo "TSP Assumption Validation"
echo "========================="
echo ""

for f in fixtures/*.tsp; do
  run_fixture "$f"
done

echo ""
echo "Results: $PASS passed, $FAIL failed"

if [[ $FAIL -gt 0 ]]; then
  exit 1
fi
