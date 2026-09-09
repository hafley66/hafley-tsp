# Entity.intern verification, 2026-09-09

Worktree: `/private/tmp/hafley-tsp-entity-intern-20260909`
Branch: `work/entity-intern-20260909`, base `87ae6aa`.
The original hafley-tsp checkout's existing changes were preserved.
Dependencies are read through local node_modules symlinks;
no npm install, package publication, global binary install, or database migration.

## Current results

- Binding-core TypeScript declaration compilation and Rollup build: exit 0.
- `node --test tests/2_intern.test.mjs`: 6 passed, 0 failed, 0 skipped.
- Included generated Rust/SQLx SQLite execution: 1 passed, 0 failed. This compiles
  the complete generated.rs module and its intern_auto.rs child.
- Extract compatibility: `HAFLEY_TSP_ROOT=/private/tmp/hafley-tsp-entity-intern-20260909 just gen-check`
  from `/private/tmp/sprefa-extract-field-reports-20260908`: 5 passed, 0 failed.
  Existing SQL/Rust/schema artifacts remained current with this library.

Build/test command from packages/binding-core:

```sh
./node_modules/.bin/tsc -p tsconfig.build.json &&
./node_modules/.bin/rollup -c rollup.config.mjs &&
node --test tests/2_intern.test.mjs
```

Tests add TypeSpec compilation, diagnostics/noEmit/no-partial-publication,
domain/key projection, namespace and generated-name collisions, inheritance,
legacy SQL compatibility, normal compilation output, unchanged auto-file mtime,
and generated Rust execution. Runtime assertions cover exact strings including
embedded NUL and Unicode, scoped uniqueness, optional/null values, integer FK
enforcement, transaction rollback, outer savepoints, reopen, no UPDATE trigger
on intern hits, and eight concurrent generated writers converging to one ID.
No existing test file was removed. No CI workflow file was changed.

Final generated example and database:
`/private/var/folders/z2/cwfm40fn65n176q8m227wl0r0000gn/T/binding-core-intern-nOEmDX/rust/`.

## Remaining boundaries

See ../README.md for deliberately rejected shapes and current SQL/Rust-only
interning support. Extract's consuming TypeSpec schema and native rusqlite
writer remain unchanged, as do config/paging/jq and the independent IVM plugin.
This work adds no work-use security certification or supply-chain audit.
