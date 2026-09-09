# @hafley/typespec-rusqlite

Synchronous native rusqlite row structs, ordinary writers, interned writers,
and standalone Rust storage output over `@hafley/typespec-sql`.

```typespec
import "@hafley/typespec-rusqlite";
```

Run `tsp compile path/to/main.tsp`. The import writes
`tsp-output/schema_auto.sql`, `generated.rs`, and, when the schema contains
interned scalars, `intern_auto.rs`. Import one automatic emitter per TypeSpec
program. Combining rusqlite with SQLx or binding-core reports a compile
diagnostic before output is created.

The generated Rust requires these Cargo dependencies:

```toml
[dependencies]
rusqlite = "0.40"
serde = { version = "1", features = ["derive"] }
```

JavaScript callers can compose output without the automatic hook:

```ts
rusqliteStorage(program: Program, options?: RusqliteStorageOptions): RusqliteStorageParts
emitRusqliteRust(program: Program, existingFile?: string, options?: Omit<RusqliteStorageOptions, "existingFile">): OutputDirectory
emitRusqliteRustFromStorage(storage: RusqliteStorageParts, existingFile?: string): OutputDirectory
emitRusqliteValueWriters(program: Program, options?: RusqliteValueWriterOptions): string
emitRusqliteTaggedRowWriter(program: Program, options: RusqliteTaggedRowWriterOptions): string
emitInternRusqlite(storage: InternStorage, rustType, ident, dialect?: SqlDialect, includeTrait?: boolean): string
```

`emitRusqliteTaggedRowWriter` emits strict serde models for a family selected
by a configured string-literal discriminant, static typed inserts, and a
caller-owned batch loop. Configured source columns are supplied separately from
the deserialized payload. One configured ordinal source column advances across
the batch. The output exposes `Fact`, `Source`, `TABLE_COUNT`, per-model
`insert`, and `insert_all`. Its generated error type and JSON codecs require
`serde_json`. Relations and interned storage are rejected
by this API and remain handled by their dedicated emitters.

`emitRusqliteValueWriters` emits one static-SQL dispatcher accepting caller-
validated `rusqlite::types::Value` slices. It does not open a transaction, so
the caller owns the enclosing atomic write scope. The caller may supply JSON
as TEXT and preserve `uint64` as INTEGER-or-decimal-TEXT. The tagged-row writer
generates that exact unsigned codec. Compile through SQL core declarations
for these APIs.

Generated writers have this connection boundary:

```rust
pub trait RusqliteWriteConnection {
    fn begin_write(&mut self) -> rusqlite::Result<rusqlite::Savepoint<'_>>;
}

pub fn upsert_entity<C: RusqliteWriteConnection + ?Sized>(
    conn: &mut C,
    /* borrowed strings and scalar values */
) -> rusqlite::Result<i64>;
```

The trait is generated for `rusqlite::Connection`, `Transaction<'_>`, and
`Savepoint<'_>`. Each writer owns and releases one native nested savepoint.
The caller retains ownership of an outer transaction or savepoint. The caller
must enable foreign keys and configure `busy_timeout` on each connection.

The ordinary storage adapter supports `sqliteDialect` and was executed against
rusqlite 0.40.2. It rejects `uint64` inputs because rusqlite does not provide default `ToSql`
support for them without its optional `fallible_uint` feature. Unknown SQL scalar
names retain SQL core's `TEXT` fallback. PostgreSQL is not included.

Build in dependency order: `sql`, then `sqlx` and `rusqlite`, then
`binding-core`. Rusqlite production code depends on SQL core and does not import
SQLx or binding-core.
