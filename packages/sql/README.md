# @hafley/typespec-sql

SQL storage declarations, decorators, lowering, SQLite rendering, and auto-file
content helpers.

```typespec
import "@hafley/typespec-sql";
```

The TypeSpec import declares `Entity` and `Rel`. It registers no automatic
output hook. JavaScript callers can import:

```ts
internStorage(program: Program): InternStorage
emitSQL(program: Program, dialect?: SqlDialect): string
emitSQLFromStorage(program: Program, storage: InternStorage, dialect?: SqlDialect): string
autoFile(program, sourceTypes, body, existingFile?, fileName?, comment?): string | undefined
internAutoFile(program, storage, body, existingFile?, fileName?, comment?): string | undefined
```

`sqliteDialect` preserves the existing SQLite scalar mapping, including the
legacy `TEXT` fallback for unrecognized scalar names. `emitSQL(program)` retains
the existing unannotated SQL bytes. No PostgreSQL dialect is included.

Build packages in dependency order: `sql`, then `sqlx` and `rusqlite`, then
`binding-core`. Driver adapters currently support SQLite through SQLx or
rusqlite.
