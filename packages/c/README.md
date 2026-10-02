# @hafley66/alloy-c

TypeSpec to C11 declarations, SQLite store APIs, yyjson codecs, and argv dispatch.
Alloy resolves cross-file type includes; mimalloc owns allocated values.
Declaration symbols are namespace-qualified (Boop.User.Tag -> Boop_User_Tag).
C identifiers map hyphens to underscores, prefix a leading digit with '_', and
suffix C keywords and std macro names (stdout, errno, ...) with '_'. Wire,
database, and CLI values preserve schema spelling. Mapped symbol collisions are
emission errors.

```ts
emitC(program);                    // declarations and arena constructors
emitC(program, { wire: true });    // declarations plus JSON codecs
emitStore(program);                // SQL package facts and exact SQLite DDL
emitCli(programToOps(program));    // shared HTTP/OpenAPI route plan
writeC(program, files, outputDir); // generated preamble and unchanged-body skip
```

`$onEmit` emits all four projections. Declaration files retain namespace paths;
store files are `<namespace>/store_auto.h/c`, wire files are `wire_auto.h/c`,
and CLI files are `<service>/cli_auto.h/c`. The HTTP adapter, neutral type data,
parameter roles and route tree live in `@hafley/emit-helper/http`, also consumed
by Rust.

Models and named unions have arena constructors. Arrays and records carry a
count and items; record entries carry key/value. Named collection models have
constructors and codecs. Nullable scalar/enum values use pointers; optional
fields have presence bits. Unknown values carry serialized JSON. Constructor
copies support acyclic runtime graphs.

Each model/union exposes `<Name>_json_encode/decode`. The caller supplies the
heap; parser documents, decoded strings and encoded output live until that
heap is destroyed. Invalid JSON, kinds, enum values, integer ranges, or
allocation failures return NULL. Named unions encode tag/value objects.

Store insert/select functions return sqlite status codes and finalize their
statements. Select output rows, strings and blobs belong to the caller's heap.
Rows represent physical SQL affinity, including integer interned IDs.

CLI parse returns 0, -1 for displayed help, or 2 for errors. Dispatch calls
`<service>_ops` callbacks with typed args and returns the handler's exit status.
`<service>_ops_init(...)` requires one slot per operation. Enum/union callback
macros similarly require one callback per case. Compile manual switches with
`-Wswitch-enum -Werror` to enforce coverage.

Build, snapshot tests, the separate C fixture gate, and consumer integration
commands are in [REPORT.md](REPORT.md).
