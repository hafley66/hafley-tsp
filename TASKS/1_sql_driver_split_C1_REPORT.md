# C1 SQL and SQLx package extraction report

Base SHA: `bd18643cae02327a660fbecb96c13adb4832f091`

## Dependency and ownership map

| Package | Owns | Production dependencies |
|---|---|---|
| `@hafley/typespec-sql` | Entity/Rel declarations and decorators, shared state, storage facts, intern projection, SQL dialect, SQLite renderer, auto-file content | decorator-def, TypeSpec compiler |
| `@hafley/typespec-sqlx` | SQLx row/upsert generation, interned writers, standalone Rust storage output, adapter validation and automatic hook | SQL, Alloy core, alloy-rs, TypeSpec compiler |
| `@hafley/typespec-binding-core` | Bind/Source/Sync/Config/Cli/Http, legacy automatic composition and public facades | SQL, SQLx, existing binding dependencies |

Dependency direction is `sqlx -> sql` and `binding-core -> sql + sqlx`.
SQL has no binding-core, SQLx, Alloy, Rust-driver, or database-driver import.
SQLx has no binding-core import. There are no cross-package `../src` imports.

Entity/Rel decorators have one runtime owner. `BindingCoreStateKeys` aliases the
actual SQL symbols. Mixed SQL and binding-core imports share decorator function,
namespace, key, and state contents.

Automatic emitters export markers through their actual TypeSpec JavaScript
entrypoints. Both binding-core and SQLx scan `Program.jsSourceFiles` before any
mkdir/write. Importing both reports `binding-core, sqlx` in either import order.
SQL core registers no output hook.

## Public APIs

SQL:

```ts
internStorage(program: Program): InternStorage
emitSQL(program: Program, dialect?: SqlDialect): string
emitSQLFromStorage(program: Program, storage: InternStorage, dialect?: SqlDialect): string
autoFile(program, sourceTypes, body, existingFile?, fileName?, comment?): string | undefined
internAutoFile(program, storage, body, existingFile?, fileName?, comment?): string | undefined
```

`SqlDialect` contains `name`, `quoteIdentifier`, `scalarType`, `exactTextType`,
`identityColumn`, `placeholder`, `conflictClause`, `returningClause`, and
`nullSafeEquals`. `sqliteDialect` is the default.

SQLx:

```ts
sqlxStorage(program: Program, options?: SqlxStorageOptions): SqlxStorageParts
emitSqlxRust(program: Program, existingFile?: string, options?: Omit<SqlxStorageOptions, "existingFile">): OutputDirectory
emitSqlxRustFromStorage(storage: SqlxStorageParts, existingFile?: string): OutputDirectory
emitInternRust(storage: InternStorage, rustType, ident, dialect?: SqlDialect): string
emitUpsertFn(program: Program, fields: ResolvedField[], modelName: string, strategy: SqlxStrategy): string
validateSqlxStorage(storage: InternStorage, dialect: SqlDialect, strategyForModel?): void
```

Binding-core retains `emitSQL`, `emitRust`, `internStorage`, state keys,
decorator accessors, diagnostics, and its aggregate `$decorators`. Its
compatibility `internStorage` retains explicit Sync strategy rejection,
interned Bind-target rejection, and the previous Rust identifier rules. Its
ordinary storage composition passes the already-resolved Sync strategy into
SQLx.

## Verification

Final gate command, exit 0:

```text
pnpm --filter @hafley/typespec-sql build &&
pnpm --filter @hafley/typespec-sqlx build &&
pnpm --filter @hafley/typespec-binding-core build &&
node --test packages/sql/tests/*.test.mjs &&
C1_SQLX_CARGO_TARGET=/private/tmp/sqlx-c1-cargo.9Mz6DO node --test packages/sqlx/tests/*.test.mjs &&
node --test packages/binding-core/tests/2_intern.test.mjs
```

Results:

- SQL build: exit 0.
- SQLx build: exit 0.
- Binding-core build: exit 0.
- SQL tests: 5 passed, 0 failed.
- SQLx tests: 5 passed, 0 failed.
- Binding-core tests: 6 passed, 0 failed.
- Total: 16 passed, 0 failed.
- Standalone SQLx generated Rust executed the existing SQLite rollback,
  savepoint, reopening, exact string/NUL/Unicode, FK, and concurrent-writer fixture.
- Legacy binding-core generated Rust executed the same fixture.

The standalone Cargo target was `/private/tmp/sqlx-c1-cargo.9Mz6DO`.
The legacy test retains its existing isolated worktree target at
`packages/binding-core/target/intern-tests`.

Independent parent verification on the final C1 code:

- All three package builds exited 0.
- Combined SQL, SQLx, and binding-core test invocation passed 16 tests with 0
  failures, including both Rust fixtures, using a private SQLx Cargo target.
- Extract `gen-check` ran at `/private/tmp/sprefa-extract-field-reports-20260908`
  with `HAFLEY_TSP_ROOT` set to this worktree and no `NODE_PATH` override: exit
  0, 5 passed, 0 failed, including generated Rust, current artifact bytes, and
  SQLite fixtures. No extract files were edited.

## Coverage

Added 5 SQL tests covering ownership/state identity, SQL-only imports, core
projection and rendering, exact legacy SQL/fallback, custom dialect receiver
dispatch, no automatic output, invalid declarations, and the legacy `self`
domain case.

Added 5 SQLx tests covering package-name/tspMain resolution, public storage
composition, standalone generated Rust execution, compile-twice mtime
preservation, manual-zone preservation, conflicting hook import orders,
unsupported dialect rejection, invalid/noEmit behavior, and explicit Sync
strategy compatibility rejection.

Existing binding-core coverage was retained. No test or CI workflow was
weakened or removed.

## Observable limitations and changes

- SQLx accepts the SQLite dialect. PostgreSQL and rusqlite are outside C1.
- The legacy SQL scalar fallback remains `TEXT`.
- Invalid `@Entity.intern` decorator annotations now report through
  `@hafley/typespec-sql`. Binding-core retains its `invalid-intern` diagnostic
  for compatibility-lowering errors.
- Generated dictionary queries use dialect-provided table quoting and retain
  `ON CONFLICT(value) DO NOTHING` plus `WHERE value = ?`. Entity conflict-key
  fallback queries use dialect-provided null-safe `IS` equality.
- SQL and SQLx build/test dependency installation used worktree-local links to
  already installed dependencies because the offline pnpm store lacked
  `@inquirer/type@4.0.4`. No original-checkout files were written.

## Modified files

New SQL package: `packages/sql/package.json`, `tsconfig.json`,
`tsconfig.build.json`, `README.md`, `lib/main.tsp`, `lib/entity.tsp`,
`lib/rel.tsp`, `src/0_lib.ts`, `src/1_decorators.ts`, `src/2_facts.ts`,
`src/3_intern.ts`, `src/4_dialect.ts`, `src/5_emit_sql.ts`,
`src/6_auto_file.ts`, `src/index.ts`, `src/tsp-index.ts`,
`tests/0_ownership.test.mjs`, `tests/1_storage.test.mjs`.

New SQLx package: `packages/sqlx/package.json`, `tsconfig.json`,
`tsconfig.build.json`, `rollup.config.mjs`, `README.md`, `lib/main.tsp`,
`src/0_lib.ts`, `src/1_validate.ts`, `src/2_intern_writer.ts`,
`src/3_storage.tsx`, `src/4_emit.tsx`, `src/5_validate.ts`, `src/index.ts`,
`src/tsp-index.ts`, `tests/0_sqlx.test.mjs`.

Changed binding-core: `package.json`, `rollup.config.mjs`, `lib/main.tsp`,
`lib/entity.tsp`, `lib/rel.tsp`, `src/lib.ts`, `src/decorators.ts`,
`src/2_facts.ts`, `src/2a_intern.ts`, `src/3_validate.ts`,
`src/4_emit-sql.ts`, `src/4a_emit_intern.ts`, `src/5_emit-rust.tsx`,
`src/index.ts`, `src/tsp-index.ts`.

Workspace/task files: `pnpm-lock.yaml`,
`TASKS/0_sql_driver_split_STATUS.md`, `TASKS/1_sql_driver_split_C1_REPORT.md`.
