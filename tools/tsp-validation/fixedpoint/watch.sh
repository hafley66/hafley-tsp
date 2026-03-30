#!/bin/bash
# Fixed-point file watcher. Recompiles on .tsp changes, loops until clean.
set -uo pipefail
cd "$(dirname "$0")"

DIRTY=".tsp-dirty"
INPUT="input.tsp"

converge() {
  for i in $(seq 1 5); do
    rm -f "$DIRTY"
    output=$(npx tsp compile "$INPUT" --no-emit 2>&1)
    echo "$output" | grep -E "^\[codegen\]|error" | head -5
    [[ ! -f "$DIRTY" ]] && echo "  ✓ clean (pass $i)" && return 0
    echo "  ↻ dirty, recompiling..."
  done
  echo "  ✗ did not converge after 5 passes"
  return 1
}

echo "=== tsp fixed-point watcher ==="
echo "watching for .tsp changes (ignoring autozone writes)..."
echo ""

# Initial compile
converge

# Watch loop -- poll every second, check mtimes
LAST_HASH=""
while true; do
  # Hash all .tsp files except generated ones
  HASH=$(find . -name '*.tsp' ! -name 'gen_*' -newer "$DIRTY" 2>/dev/null | sort | md5sum 2>/dev/null || md5 -q 2>/dev/null || echo "")
  if [[ "$HASH" != "$LAST_HASH" ]]; then
    LAST_HASH="$HASH"
    echo "── change detected ──"
    converge
  fi
  sleep 1
done
