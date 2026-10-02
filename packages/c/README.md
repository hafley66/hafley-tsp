# @hafley66/alloy-c

TypeSpec to C11 type declarations, using Alloy 0.23.0-dev.12 and mimalloc heaps.
The grammar components and printing policy in `src/gen` and `src/c` were copied
from `hafley-tsp-alloy-turnkey/lab/isolated/the-gang-tries-to-make-alloy-turnkey`
(the tree-sitter-c experiment). Only the declaration components used here were copied.
Names retain their TypeSpec spelling; invalid C identifiers cause emission errors.

Build: `pnpm --dir packages/c build`. Test: `pnpm --dir packages/c test`.

```sh
tsp compile main.tsp --emit @hafley66/alloy-c --output-dir out
BOOP_SCHEMA=/path/to/boop2/schema pnpm --dir packages/c test
```

`emitC(program)` returns deterministic `{path, contents}` files. `writeC(program,
files, outputDir)` adds a timestamp, input/output hash and contributing source
list, then skips unchanged files. `$onEmit` provides the compiler emitter hook.
Output paths retain namespace segments and declaration names, for example
`Boop/Acp/channel/Delivery_auto.h` and `Delivery_auto.c` beside it.

Model and union constructors copy strings and model/union pointers recursively
into the caller's `mi_heap_t *`. Destroy that heap once the lifetime ends. Cyclic
runtime pointer graphs require separate handling; constructors support acyclic
values of recursive types. Vtables contain function pointers and accept explicit
`self` and `arena` arguments. Vtable construction copies the table by value.

Enums expose `<Name>_to_string` and arena-allocated `<Name>_from_string` functions.
Explicit string values are retained; numeric values use their decimal spelling.
Unknown strings, invalid tags and null arena/input pointers return `NULL` from
allocating APIs. Allocation failures propagate `NULL`; intermediate allocations
remain in the heap until its destruction.

Unions expose `<Name>_tag_to_string`, `<Name>_create_<variant>` and
`<Name>_parse(arena, tag, payload)`. The payload is a typed `<Name>_value` union
whose active member must agree with the tag. This phase provides tag/payload
reconstruction; it does not provide JSON parsing or transport codecs.

For exhaustive dispatch, initialize `<Name>_cases` using
`<Name>_cases_init(callback_for_first_variant, callback_for_second_variant, ...)`
and call `<Name>_match`. Adding a variant increases the macro's required arity,
so existing initializers fail compilation until a callback is added. Compile
manual switches with `-Wswitch-enum -Werror` to enforce their coverage too.

C11-invalid identifiers produce an emission error. The current boop2 enum
schema includes hyphenated member names; the full consumer gate requires a
naming exception. See `REPORT.md` for the recorded gaps and gate status.
