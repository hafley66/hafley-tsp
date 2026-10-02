# alloy-c phase 1

## TypeSpec construct to C form

| TypeSpec | C11 output | Arena behavior |
|---|---|---|
| Named scalar | `typedef` of its base scalar, retaining the declaration name | No allocation |
| Model | Forward typedef and struct; inherited properties flattened; optional properties add `has_<property>` | `<Name>_create(arena, input)` allocates and recursively copies strings and model/union pointers |
| Enum | Enum with `<Name>_<member>` constants; value/string table; `to_string`, `from_string`, callback dispatch | `from_string` allocates its result in the supplied heap |
| Named union | Tag enum, payload union, tagged struct, variant constructors, tag string conversion, typed tag/payload parser | Constructors and parser copy the active payload into the supplied heap |
| Interface | Vtable struct with one function pointer per operation; unchanged operation/parameter names | Each operation receives `self` and `mi_heap_t *arena`; table constructor copies by value |
| Primitive scalar | Exact-width integer, bool, float/double, or `char *` | String copies use `mi_heap_strdup` |

Outputs are `<namespace segments>/<name>_auto.h` and `_auto.c`. The writer adds
render time, a source/output hash, and contributing `.tsp` paths. Identical input
hashes or bodies preserve mtimes. Manual sibling files remain untouched.
Alloy refkeys resolve type names and generate cross-file header includes.
Forward model/union/interface typedefs precede includes to support recursive
pointer declarations. Declaration names retain their source spelling.

## Verification

- Package TypeScript declaration build and Rollup build: exit 0.
- Built emitter loaded through TypeSpec `compile(..., { emit: [packagePath] })`:
  0 diagnostics; output written under `@hafley66/alloy-c`.
- Fixture: 8 declarations, 16 emitted files. Each of its 8 `.c` files compiled
  with `zig cc -std=c11 -Wall -Wextra -Werror -Wswitch-enum -c`: exit 0.
- Linked C program: exit 0. Checks enum string round trips and typed union round trips for model/string/int64/
  null variants, optional fields, recursive model pointers, vtable calls, invalid
  parse inputs, heap ownership, and copies after destroying the source heap.
- Enum and union exhaustive callback initializers compile before adding a
  variant, then fail with exit 1 after adding a variant. Generated
  `<Name>_cases_init(...)` macros require one argument per case.
- Manual sibling content and generated mtimes survive repeated emission.
- Emitted text has Vitest snapshots. Full test run: 13 passed, 1 failed.
- Homebrew mimalloc 3.5.4 was installed because its header was absent.

## Consumer gate: pending naming choice

`/Users/chrishafley/projects/boop2/schema/0_ids.tsp` and `1_enums.tsp` compile with
0 TypeSpec diagnostics and contain 41 scalars and 64 enums. Seven enums contain
29 hyphenated member names. The first emission error is:

```
Invalid C11 identifier: backfill-spawned-edge
```

Names as written and C11 compilation conflict for these members. The emitter
reports the error and preserves the boop2 schema. The full boop2 compilation and
enum round-trip gate remains pending a naming exception. No C-specific
schema decorators were added. The fixture gate runs independently.

Affected enums are `Boop/Tables/dict_attach`, `dict_edekind`,
`dict_observation_source`, `dict_session_relation_kind`,
`dict_trace_classification`, `dict_trace_delivery`, and `dict_trace_kind`.

## Gaps

- C has global enum/type/function names. `Rung` exists under
  `Boop/Harness/identity` and `Boop/Proc/deliver`; `Confidence` exists under
  `Boop/Harness/pane` and `Boop/Turnvis`. Separate paths allow separate compilation.
  Combining these headers or linking both implementations requires a naming or
  symbol-isolation policy. The requested gate links one boop2 enum with the fixture.
- Arrays, records, anonymous models, unnamed union variants, unsupported scalars,
  optional interface parameters, and generated-field collisions produce errors.
  Numeric enums require unique integral C11 `int` values and unique wire strings.
- Template declarations are skipped. This phase has no generic C instantiation
  scheme, transport bindings, JSON codecs, or top-level operation emission.
- Union parsing consumes a tag plus a typed payload with the corresponding active
  member. It does not decode a serialized message.
- Arena lifetime declarations and lifetime lint from the design are deferred.
  The caller supplies a heap for every allocating API; all allocations live until
  that heap is destroyed. There are no generated per-struct malloc/free functions.
- Recursive type declarations compile. Recursive constructors require acyclic
  runtime values; sharing is copied without pointer memoization. Allocation
  failures return NULL; intermediate allocations remain until heap destruction.
- Manual code participates through generated headers. Parsing handwritten C into
  Alloy scopes, opt-out markers, deleted-auto-file tracking, and a watcher are
  outside this implementation.

## Line counts

Counts are newline counts. Emitted counts exclude generated metadata preambles.

| Group | Files | Lines |
|---|---:|---:|
| C policy, scope, printer, source file, copied grammar components | 5 | 357 |
| TypeSpec collection, mapping, emission, writer | 4 | 355 |
| Vitest source | 5 | 129 |
| Snapshots | 4 | 788 |
| TypeSpec and C fixtures | 2 | 113 |
| Emitted fixture headers | 8 | 132 |
| Emitted fixture sources | 8 | 172 |
| Emitted boop2 output | 0 | 0 |

## Source references

- Requested design path was absent. Read the copy at
  `/Users/chrishafley/projects/boop2-gc/plans/5_c_arenas.md`.
- Requested hafley-rs generator path was absent. Copied declaration components,
  grammar printer, scope and name policy from
  `/Users/chrishafley/projects/hafley-tsp-alloy-turnkey/lab/isolated/the-gang-tries-to-make-alloy-turnkey`
  at checkout `635a231`. The SourceFile component now resolves cross-file includes;
  the name policy reports invalid identifiers instead of rewriting them.
- Consumer schema files were read directly at the requested boop2 path.
- Package uses `@alloy-js/core` `0.23.0-dev.12`, matching `packages/rust`.

## 2026-10-02 naming

C identifiers map `-` to `_`. Enum values and union tag strings retain their
original spelling. Mapped declaration, member, and generated field collisions
are emission errors. No gate was run in this lane.

## Store emitter

`packages/sql/src/4a_table_facts.ts` exports physical table/column facts for
ordinary entities, interned dictionaries, and interned entity tables. The SQL
renderer and C emitter use the same column naming function. Store DDL comes
from `emitSQL(program)` with its default SQLite dialect, byte for byte.
`<namespace>/store_auto.h` declares rows, typed insert, and select-all APIs;
`store_auto.c` uses prepared statements and checks bind/step/finalize results.
Nullable columns have presence bits. Strings and blobs are copied into the
caller's `mi_heap_t`; partially allocated results remain in that heap on error.
SQL storage affinity determines row types: int64, double, text, or blob with
length. Logical interned strings are physical integer IDs in these row APIs.
No test or compiler command was run.

## JSON library candidates

Sizes describe source integration units, not compiled binary measurements.

| Library | License | Source size / integration | Allocator hooks |
|---|---|---|---|
| [yyjson 0.12.0](https://github.com/ibireme/yyjson/tree/0.12.0) | MIT | 410813-byte C source, 322407-byte header, measured vendored files | Per-document malloc/realloc/free with context; fixed pool and dynamic allocators |
| [cJSON](https://github.com/DaveGamble/cJSON) | MIT | One C source and header | Global malloc/free hooks, no heap context |
| [Jansson](https://github.com/akheron/jansson) | MIT | Multi-source library with configured header | Global malloc/free hooks, no per-document heap context |

Selected yyjson 0.12.0. Vendored source, header and license live in the slice's
`impl/c/vendor/yyjson`; its Makefile builds `yyjson.o` alongside `mimalloc.o`.
The generated allocator uses `mi_heap_malloc` and `mi_heap_realloc`; free is a
no-op, with heap destruction reclaiming the document and output together.
`wire_auto.h/c` exposes `<Name>_json_encode/decode` and DOM conversion helpers
for each model/union. Cross-file type includes come from Alloy refkeys.
Models preserve field spellings. Optional members are omitted when absent;
nullable values use pointer presence. Arrays use `{count, items}`.
Named unions currently use `{ "tag": <exact variant name>, "value": <payload> }`.
`unknown` is arena-owned serialized JSON, passed through yyjson DOM APIs.
Embedded NUL strings are rejected because emitted C strings are NUL terminated.
Integer decoding rejects range overflow; malformed JSON and mismatched kinds
return NULL. Recursive JSON/model traversal relies on acyclic value graphs.
