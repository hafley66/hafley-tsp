#!/usr/bin/env bash
# Fixed-point TSP compilation loop.
# Runs tsp compile until codegen stops modifying the source file.
set -uo pipefail
cd "$(dirname "$0")"

MAX=5
DIRTY_FILE=".tsp-dirty"

# Clean state from previous runs
rm -f "$DIRTY_FILE" gen_routes.tsp
# Reset input.tsp to remove any previous autozone
sed -i '' '/--- AUTOZONE START/,/--- AUTOZONE END/d' input.tsp 2>/dev/null
# Remove trailing blank lines
sed -i '' -e :a -e '/^\n*$/{$d;N;ba' -e '}' input.tsp 2>/dev/null

echo "=== Fixed-point compilation test (in-file autozone) ==="
echo ""
echo "--- input.tsp before ---"
cat input.tsp
echo ""

for i in $(seq 1 $MAX); do
  echo "--- pass $i ---"
  output=$(npx tsp compile input.tsp --no-emit 2>&1)
  code=$?
  echo "$output" | grep -E "^\[codegen\]|  [A-Z]" | head -10

  if [[ ! -f "$DIRTY_FILE" ]]; then
    echo ""
    echo "=== Converged after $i pass(es) ==="
    echo ""

    # Verify it compiles clean
    verify=$(npx tsp compile input.tsp --no-emit 2>&1)
    if echo "$verify" | grep -q " error "; then
      echo "ERROR: file has compile errors after convergence"
      echo "$verify" | grep " error "
      echo ""
      echo "--- input.tsp after ---"
      cat input.tsp
      echo "FAIL"
      exit 1
    fi

    echo "--- input.tsp after ---"
    cat input.tsp
    echo ""
    echo "PASS"
    exit 0
  fi

  echo ""
done

echo "ERROR: still dirty after $MAX passes"
echo ""
echo "--- input.tsp ---"
cat input.tsp
exit 1
