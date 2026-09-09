# SQL driver split status

- [x] 1/5 package/decorator ownership
- [x] 2/5 core storage and dialect
- [x] 3/5 SQLx extraction and legacy composition
- [x] 4/5 compatibility tests
- [x] 5/5 C1 receipt

Current: C1 complete; stopped before rusqlite.
Last verified: final package builds passed and the final C1 gate passed 16 tests with 0 failures.
Blocker: none.

Independent parent verification also passed all three builds, the combined
16-test gate, and extract `gen-check` with 5 passed and 0 failed.

## C1a

- [x] SQL manifest, build configuration, and TypeSpec/JavaScript entrypoints
- [x] Entity/Rel declarations and decorators moved to SQL
- [x] Binding-core dependency, shared state aliases, and compatibility reexports
- [x] SQL and binding-core builds plus mixed-import/state-identity test

Commands:

- `pnpm --filter @hafley/typespec-sql build`: exit 0.
- `pnpm --filter @hafley/typespec-binding-core build`: exit 0.
- `node --test packages/sql/tests/0_ownership.test.mjs`: exit 0, 1 passed, 0 failed.
- Parent check: five non-Rust binding-core tests passed, including exact legacy SQL, invalid/no-output behavior, and unchanged-body mtime preservation.

The `invalid-intern` diagnostic is now owned by `@hafley/typespec-sql`, so its
formatted library prefix changes for invalid `@Entity.intern` declarations.
Binding-core retains its `reportDiagnostic` and `createDiagnostic` exports.

Offline install could not complete because the local pnpm store lacks
`@inquirer/type@4.0.4`. Verification used worktree-local, individually scoped
links to the original checkout's installed dependencies and built
`decorator-def`/`alloy-rs`; no original-checkout files were written.

## C1b

- [x] Storage-only facts and intern projection moved into `packages/sql`
- [x] SQLite dialect boundary, SQL renderer, and auto-file helper moved into `packages/sql`
- [x] Binding-core compatibility lowerer/facades retain Bind, Sync, and Rust identifier behavior
- [x] SQL-only, exact output/fallback, custom dialect receiver, no-emission, invalid, and legacy `self` domain coverage

Public core signatures:

- `internStorage(program: Program): InternStorage`
- `emitSQL(program: Program, dialect?: SqlDialect): string`
- `emitSQLFromStorage(program: Program, storage: InternStorage, dialect?: SqlDialect): string`
- `autoFile(program, sourceTypes, body, existingFile?, fileName?, comment?): string | undefined`
- `internAutoFile(program, storage, body, existingFile?, fileName?, comment?): string | undefined`

Commands:

- `pnpm --filter @hafley/typespec-sql build`: exit 0.
- `pnpm --filter @hafley/typespec-binding-core build`: exit 0.
- `node --test packages/sql/tests/*.test.mjs`: exit 0, 5 passed, 0 failed.
- `node --test --test-name-pattern '^(?!generated Rust)' packages/binding-core/tests/2_intern.test.mjs`: exit 0, 6 passed, 0 failed. Node's name filter matched the Rust case, so this became the full existing gate; generated Rust executed successfully against SQLite.
- After changing the binding hook to render its already-validated storage: `pnpm --filter @hafley/typespec-binding-core build && node --test --test-name-pattern 'shared lowering|invalid declarations|qualified scalar|existing unannotated|normal compile' packages/binding-core/tests/2_intern.test.mjs`: exit 0, 5 passed, 0 failed, Rust case excluded.

CI coverage added: four SQL-core test cases. Existing binding-core coverage is unchanged.
