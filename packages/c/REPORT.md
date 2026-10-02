# alloy-c CLI, store and wire emitters

Base: local main 8f679b1. Lane: feature/alloy-c-boop2-emitters.
Consumer slice: /Users/chrishafley/projects/boop2/.boop-worktrees/c/first-slice,
branch c/first-slice. No installs, builds, TypeSpec compilation, Vitest, Zig,
make, or bats commands were run. No push. Consumer gen files were read and
remain untouched. The code has been reviewed statically; executable gates
belong to the coordinator.

## Output and naming

C identifiers map only '-' to '_'. String value tables, union tags, JSON
property keys and CLI option spellings keep their schema spelling. Mapped
member, field, global declaration/function and output-path collisions are
emission errors. C keyword identifiers remain errors.

| Projection | API | Output |
|---|---|---|
| Declarations | emitC(program) | namespace/Name_auto.h and .c |
| Wire | emitC(program, { wire: true }) | declarations plus wire_auto.h and .c |
| Store | emitStore(program) | namespace/store_auto.h and .c |
| CLI | emitCli(programToOps(program)) | service/cli_auto.h and .c |

The compiler hook combines these projections. The writer hashes source text
and rendered bodies, lists contributing source files, and preserves unchanged
file bodies and mtimes. It refuses manual paths and duplicate output paths.

## SQL facts and store ownership

packages/sql/src/4a_table_facts.ts exports physical facts for ordinary entities,
interned dictionaries and interned entity tables. The SQL renderer and C use
the same column naming function. DDL is emitSQL(program), byte for byte, using
the SQL package's default SQLite dialect. Each namespace store exposes that
whole-program DDL so foreign table dependencies are retained.

Per-table rows use SQLite physical affinity: int64, double, text or blob with
length. Nullable columns have presence bits. Interned dictionary references
are integer IDs; the SQL package owns readable-view rendering. Insert binds
by column type. Select-all prepares a fixed column list, steps rows and copies
strings/blobs into the caller's mi_heap_t. Bind, step and finalize errors are
returned as SQLite status codes. Embedded NUL text is rejected. Partial arena
allocations survive an error until heap destruction.

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

## CLI library candidates

| Library | License | Integration size | Relevant behavior |
|---|---|---|---|
| [getopt_long](https://man.freebsd.org/cgi/man.cgi?query=getopt_long&sektion=3) | Platform libc: BSD on Darwin/BSD; LGPL in glibc | No vendored source or additional library on the slice's Darwin host | Declared long/short options, required values, `--`; process-global parsing state |
| [cofyc/argparse](https://github.com/cofyc/argparse) | MIT | One C source plus header | Descriptor table, help/usage, callbacks; default help macro introduces a short option |
| [argtable3](https://github.com/argtable/argtable3) | BSD-3-Clause | Amalgamated C source plus header | Descriptor tables, validation and help generation |

Selected platform `getopt_long`. No argv library vendoring is necessary on
Darwin. Generated option descriptors assign a short spelling only when the
shared TypeSpec adapter supplies one; the built-in help option is `--help`.
Numeric values, enums, required fields, conflicts, requires/requiresAll,
required-one-of groups and duplicates are checked before dispatch. String maps
use repeated KEY=VALUE values; arrays accept repeated flags or positional
values, including configured ASCII delimiters. Scalar aliases use their base
C argument type. Enum CLI arguments retain validated wire strings.
`<service>/cli_auto.h/c` exposes root args, per-operation args, a tagged request,
`<service>_ops`, and parse/dispatch functions. Callback return values are CLI
exit statuses; handlers own output production. The callback receives typed
args, root args, self, arena and the stream FILE pointer when declared.
Parse returns 0 for success, -1 for displayed help, and 2 for argument errors.
`<service>_ops_init(...)` requires one callback slot per operation.

The HTTP adapters and neutral definitions moved with `git mv` from Rust into
`packages/emit-helper/src/http/`. The route-tree builder and role classifier
also moved there. Rust imports/re-exports the shared implementation; C uses
`programToOps`, `planCliTree`, and `roleOf` from that same package. The helper
HTTP subpath now has a build script and distributable JS exports.

## Coordinator gates

Run each command separately. These commands are instructions, not recorded
verification. Setup/dependency availability is assumed as requested. Build the
changed packages in dependency order from the hafley-tsp lane:

```bash
cd /Users/chrishafley/projects/hafley-tsp/.boop-worktrees/feature/alloy-c-boop2-emitters
pnpm --dir packages/sql build
pnpm --dir packages/emit-helper build
pnpm --dir packages/rust build
pnpm --dir packages/c build
```

Snapshot and shared-consumer tests, each as a separate gate:

```bash
pnpm --dir packages/c test
pnpm --dir packages/emit-helper test
pnpm --dir packages/rust test
```

C fixture emission, compilation and round trips:

```bash
BOOP_C_SLICE=/Users/chrishafley/projects/boop2/.boop-worktrees/c/first-slice node packages/c/test/4_compile_fixture.mjs
```

The script uses the built emitter for separate store/wire/CLI fixtures, then
compiles every emitted source with zig cc -std=c11 -Wall -Wextra -Werror
-Wswitch-enum. It builds the slice's pinned vendor sources and runs manual
C drivers. Store assertions cover persistence, constraint failure and row
ownership after SQLite close. Wire assertions cover enum strings, escaped
text, arrays, nullable INT64_MAX, overflow rejection and copies across heap
destruction. CLI assertions cover an explicitly declared short flag, exact
long flags, typed dispatch, invalid numbers and undeclared short flags.
Set C_FIXTURE_OUTPUT to retain inspectable output. Legacy compiler-spawning
Vitest cases require C_GATE=1; default Vitest runs snapshot/text tests only.

Consumer compile, after reconciling the blockers below, from this lane:

```bash
pnpm --dir packages/c exec tsp compile /Users/chrishafley/projects/boop2/.boop-worktrees/c/first-slice/schema/main.tsp --emit @hafley66/alloy-c --option "@hafley66/alloy-c.emitter-output-dir=/Users/chrishafley/projects/boop2/.boop-worktrees/c/first-slice/impl/c/gen"
```

The requested main checkout can instead be used as the entry point by replacing
that schema/main.tsp path with /Users/chrishafley/projects/boop2/schema/main.tsp.
It has the older flat schema in the inspected working tree. The coordinator
owns deleting placeholder output before regeneration. Do not treat this
command as a passing consumer gate on the currently inspected schemas.
The output-dir option is the compiler's standard
[emitter-output-dir setting](https://typespec.io/docs/emitters/json-schema/reference/emitter/).

Consumer build and required 18-case gate, separately:

```bash
cd /Users/chrishafley/projects/boop2/.boop-worktrees/c/first-slice
make -C impl/c
BOOP_BIN=$PWD/impl/c/boop bash tests/run.sh tests/1_whoami.bats tests/1a_user.bats
```

The 18-case result is pending. No current passing result is claimed.

## Consumer facts that cannot be derived

| Input | Inspected evidence | Missing contract |
|---|---|---|
| Main checkout schema | main.tsp imports 0_ids, 1_enums, 2_tables, 3_wire, 4_traits, 5_cli, 6_topology | Requested lane/mail/acp/... layout is present in the slice rather than this checkout |
| Slice CLI | schema/user/4_ops.tsp defines namespace operations and fields such as --source; main.tsp has local imports only | Plain HTTP/OpenAPI routes, services and parameter placement consumed by the shared Rust adapter |
| Slice SQL | schema/user/2_tables.tsp uses compiler @key; SQL facts identify Entity.pk/manual/index/unique/relations | SQL entity facts and schema authority for exact v40 DDL |
| Persisted spellings | schema/user/2_tables.tsp: agent_tag.created_at/last_used_at and agent_tag_link.linked_at | Runtime ops query created_ts/last_used_ts and ts; agent_favorite has the same created_at versus created_ts mismatch |
| Store initialization | runtime checks user_version 40; placeholders include mood seed rows and subset DDL | TypeSpec/SQL facts for schema version, seed content, checks/defaults and the selected subset |
| Output models | schema/user/3_wire.tsp defines Tag with created_at/last_used_at; Favorite and Identity are placeholder/runtime shapes | Canonical response contracts matching existing JSON and help snapshots |
| Runtime state | placeholder 0_types_auto.h contains App, Cli and process-local fields | These process-local runtime structs need a manual owner; they are not derivable boundary types |
| C global names | Phase-1 report records Rung/Confidence under distinct namespaces | Mapping requires unique C symbols; collisions now fail emission rather than reaching the linker |

No C decorators were added to boop2. No table, route, runtime state or help text
was inferred from the handwritten gen placeholders. Resolving the mismatches
above involves schema or application logic and exceeds wiring-only edits.

## Runtime wiring once contracts agree

1. 1_runtime.h: include emitted store, CLI and wire headers; own App and other
   process-local state in a manual header. Replace the placeholder Cli with the
   generated request/root/operation args or explicit typed adapters.
2. 2_main.c: call the generated service_cli_parse on the invocation heap;
   translate -1 to exit 0; open the store on parse success; initialize
   service_ops with handwritten handlers and call service_cli_dispatch.
   Keep database close and heap destruction after dispatch.
3. 1_runtime.c store_open: use the emitted namespace_ddl after the SQL schema
   contains the required persisted spellings and initialization metadata.
   Exact SQL renderer output does not synthesize user_version or seed rows.
4. Ops: adapter callbacks accept the emitted argument structs. Existing ops
   currently read a shared Cli and handwritten JSON helpers. Converting those
   reads and response types requires the agreed schema contracts above.

2_main.c and 1_runtime.c were not edited. Slice commits contain yyjson
vendoring and Makefile wiring only; Makefile source/header discovery is
recursive for namespace directories. impl/c/gen remains untouched.

## Supported representations and remaining limits

Named models/unions, literals, enums, optional fields, nullable scalar/enum
pointers, primitive arrays and string-keyed records are represented in C.
Nested collections copy their keys and values recursively. Named collection
models expose constructors/codecs. unknown is serialized JSON carried by an
arena-owned string. Cyclic runtime graphs require separate lifetime handling.
Anonymous models, unsupported scalars, unnamed non-nullable unions, optional
interface parameters, inline collection union payloads and nullable inline
collections produce emission errors; use explicit named types for these
representations. Interface collection signatures likewise require named
collection models. JSON wire serialization of tagged unions uses tag/value
objects; externally tagged or discriminator-specific wire layouts are not
inferred. CLI output uses validated string values for enums and base C types
for scalar aliases. Arbitrary model-valued CLI fields flatten through the
shared plan; streams are handed to the implementation as FILE pointers.
