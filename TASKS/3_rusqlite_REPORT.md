# C2 native rusqlite adapter report

Base SHA: `bd18643cae02327a660fbecb96c13adb4832f091`

## Package boundary

`@hafley/typespec-rusqlite` is a synchronous Rust SQLite adapter over the
driver-neutral `@hafley/typespec-sql` storage projection and `sqliteDialect`.
Its production sources and manifest contain no SQLx or binding-core dependency.
SQL core contains no database-driver dependency. Entity/Rel decorators,
`internStorage`, SQL rendering, and the domain/model walk remain owned by SQL
core.

The driver-neutral automatic-emitter scan moved from SQLx to SQL core:

```ts
const AutoEmitterMarker = "$hafleyAutoEmitter"
loadedAutoEmitters(program: Program): string[]
```

SQLx retains source-compatible reexports. Actual owner markers remain on each
package's `tsp-index` export. Rusqlite/SQLx and rusqlite/binding-core pairs are
rejected in both import orders before any output directory is created.

## Public and generated signatures

```ts
rusqliteStorage(program: Program, options?: RusqliteStorageOptions): RusqliteStorageParts
emitRusqliteRust(program: Program, existingFile?: string, options?: Omit<RusqliteStorageOptions, "existingFile">): OutputDirectory
emitRusqliteRustFromStorage(storage: RusqliteStorageParts, existingFile?: string): OutputDirectory
emitInternRusqlite(storage: InternStorage, rustType, ident, dialect?: SqlDialect, includeTrait?: boolean): string
emitRusqliteWriter(program: Program, fields: ResolvedField[], modelName: string, strategy: RusqliteStrategy): string
validateRusqliteStorage(storage: InternStorage, dialect: SqlDialect, ordinary?, strategyForModel?): void
```

`RusqliteStorageOptions` accepts `dialect`, `existingFile`, an already lowered
`InternStorage`, and an explicit `strategyForModel`. The adapter accepts
`sqliteDialect`; a non-SQLite pair is rejected before rendering.

Generated writers share this native transaction boundary:

```rust
pub trait RusqliteWriteConnection {
    fn begin_write(&mut self) -> rusqlite::Result<rusqlite::Savepoint<'_>>;
}

pub fn upsert_entity<C: RusqliteWriteConnection + ?Sized>(
    conn: &mut C,
    /* owned scalars and borrowed string inputs */
) -> rusqlite::Result<i64>;
```

The generated trait is implemented for `rusqlite::Connection`,
`Transaction<'_>`, and `Savepoint<'_>` with fully qualified inherent savepoint
calls. Every writer commits only its own nested savepoint. Caller transactions
and savepoints retain publication/rollback ownership.

## Behavior and parity evidence

- The package-name TypeSpec import resolves through `tspMain` and automatically
  emits `schema_auto.sql`, `generated.rs`, and conditional `intern_auto.rs`.
- Unchanged SQL and intern bodies retain mtime. `generated.rs` manual content is
  preserved. Switching the same generated file to SQLx replaces the rusqlite
  trait through the shared `upsert-fns` auto zone.
- Rusqlite and SQLx storage projections and emitted DDL compare byte-for-byte for
  the shared `binding-core/tests/0_intern.tsp` fixture plus scalar `self`.
- Both executed driver fixtures compare physical Link columns and the normalized
  `Link_text` row to `binding-core/tests/1_intern_golden.txt`.
- Native runtime coverage includes exact empty/NUL/Unicode/case-distinct strings,
  domain separation and scalar inheritance, nullable IDs, scalar `self`, scoped
  composite uniqueness, stable IDs, no-update conflicts, FK enforcement, failed
  write rollback, caller Transaction rollback, caller Savepoint rollback,
  reopen stability, and eight separate concurrent writer connections converging
  on one dictionary ID.
- Ordinary native writers cover a non-`id` integer primary key, update behavior,
  ID-only `DEFAULT VALUES`, unique-only `DO NOTHING` key recovery, and generated
  local-name collisions for `conn`, `tx`, and `inserted`.
- Unsupported dialects, invalid Rust names, default rusqlite-incompatible
  `uint64`, and `noEmit` produce no output. SQL core's legacy unknown-scalar
  `TEXT` fallback is unchanged.

## Verification

Final topological build command, exit 0:

```text
pnpm -r --filter @hafley/typespec-sql \
  --filter @hafley/typespec-sqlx \
  --filter @hafley/typespec-rusqlite \
  --filter @hafley/typespec-binding-core run build
```

Final combined test command, exit 0:

```text
C2_RUSQLITE_CARGO_TARGET=/private/tmp/rusqlite-c2-cargo.KvcsFF \
C1_SQLX_CARGO_TARGET=/private/tmp/sqlx-c2-cargo.7BkJtP \
BINDING_CORE_CARGO_TARGET=/private/tmp/binding-c2-cargo.FUDHiZ \
node --test packages/sql/tests/*.test.mjs \
  packages/sqlx/tests/*.test.mjs \
  packages/rusqlite/tests/*.test.mjs \
  packages/binding-core/tests/2_intern.test.mjs
```

Results: 23 passed, 0 failed. The combined gate executed the legacy
binding-core generated Rust, standalone SQLx generated Rust, and two standalone
rusqlite generated Rust crates. Focused rusqlite development coverage was 7
passed, 0 failed.

Parent independently rebuilt all four packages in dependency order and reran
the combined command above using the same private targets: exit 0, 23 passed,
0 failed. Sampled review covered savepoint ownership, ordinary writer edge
cases, package boundaries, regeneration zones, and the shared runtime golden.

Independent parent extract compatibility on the current C2 production code:

```text
HAFLEY_TSP_ROOT=/private/tmp/hafley-tsp-sql-packages-20260909 just gen-check
```

Run from `/private/tmp/sprefa-extract-field-reports-20260908`: 5 passed, 0
failed, including generated Rust compile/u32 values, DDL span keys, deterministic
artifacts, and SQLite fixtures. No extract files were edited.

## Coverage and files

C2 adds 7 Node tests and two compiled native Rust fixtures. It extends the two
existing SQLx execution harnesses with a shared normalized row/schema golden.
No CI workflow was added, removed, or weakened.

New package files: `packages/rusqlite/package.json`, `tsconfig.json`,
`tsconfig.build.json`, `rollup.config.mjs`, `README.md`, `lib/main.tsp`,
`src/0_lib.ts`, `src/1_validate.ts`, `src/2_intern_writer.ts`,
`src/3_storage.tsx`, `src/4_emit.tsx`, `src/5_validate.ts`, `src/index.ts`,
`src/tsp-index.ts`, `tests/0_smoke.test.mjs`, `tests/1_adapter.test.mjs`,
`tests/1_runtime.rs`, and `tests/2_hooks.test.mjs`.

Shared changes: `packages/sql/src/7_auto_emitters.ts`,
`packages/sql/src/index.ts`, `packages/sql/README.md`,
`packages/sqlx/src/1_validate.ts`, `packages/sqlx/README.md`,
`packages/sqlx/tests/0_sqlx.test.mjs`,
`packages/binding-core/tests/1_intern.rs`,
`packages/binding-core/tests/1_intern_golden.txt`,
`packages/binding-core/tests/2_intern.test.mjs`, `pnpm-lock.yaml`, and
`TASKS/2_rusqlite_STATUS.md`.

All changes remain uncommitted. Rusqlite was tested at 0.40.2 from the local
Cargo cache. Callers configure foreign keys and `busy_timeout` per connection.
