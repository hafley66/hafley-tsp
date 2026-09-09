# @hafley/typespec-sqlx

SQLx SQLite row structs, ordinary upsert functions, interned writers, and
standalone Rust storage output.

```typespec
import "@hafley/typespec-sqlx";
```

This import also loads `@hafley/typespec-sql` declarations and automatically
writes `tsp-output/schema_auto.sql`, `generated.rs`, and, when needed,
`intern_auto.rs`. Import one automatic emitter per TypeSpec program.
`@hafley/typespec-sqlx` and `@hafley/typespec-binding-core` together produce a
compile diagnostic before either writes output.

JavaScript callers can import:

```ts
sqlxStorage(program: Program, options?: SqlxStorageOptions): SqlxStorageParts
emitSqlxRust(program: Program, existingFile?: string, options?: Omit<SqlxStorageOptions, "existingFile">): OutputDirectory
emitSqlxRustFromStorage(storage: SqlxStorageParts, existingFile?: string): OutputDirectory
emitInternRust(storage, rustType, ident, dialect?: SqlDialect): string
```

`SqlxStorageOptions` accepts a shared core `InternStorage`, a `SqlDialect`, an
existing generated file, and an explicit per-model strategy resolver. The
adapter accepts the SQLite dialect. Existing ordinary upsert behavior and
SQLite scalar fallback remain unchanged. Build `sql` first, then `sqlx` and
`rusqlite`, then `binding-core`. Use `@hafley/typespec-rusqlite` when generated
Rust requires synchronous native rusqlite writers.
