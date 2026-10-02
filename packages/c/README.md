# @hafley66/alloy-c

TypeSpec to C11 type declarations, using Alloy 0.23.0-dev.12 and mimalloc heaps.
The grammar components and printing policy in `src/gen` and `src/c` were copied
from `hafley-tsp-alloy-turnkey/lab/isolated/the-gang-tries-to-make-alloy-turnkey`
(the tree-sitter-c experiment). Only the declaration components used here were copied.
Names retain their TypeSpec spelling; invalid C identifiers cause emission errors.

Build: `pnpm --dir packages/c build`. Test: `pnpm --dir packages/c test`.
