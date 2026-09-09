# String interning

```typespec
import "@hafley/typespec-binding-core";

@Entity.intern
scalar Symbol extends string;

model CallEdge {
  @Entity.pk id: integer;
  @Entity.unique(CallEdge.caller, CallEdge.callee)
  caller: Symbol;
  @Entity.index(CallEdge.callee)
  callee: Symbol;
}
```

SQL stores `Symbol(id INTEGER PRIMARY KEY, value TEXT NOT NULL UNIQUE)` and
`CallEdge(id, caller_id, callee_id)`, with integer foreign keys. `CallEdge_text`
is a read-only SQL view exposing the authored `caller` and `callee` strings.
Only the dictionary's uniqueness index compares string values; the edge index
and compound edge uniqueness key compare integer IDs.

Rust generates:

```rust
pub async fn intern_Symbol(conn: &mut SqliteConnection, value: &str) -> Result<i64>;
pub async fn upsert_CallEdge(conn: &mut SqliteConnection, caller: &str, callee: &str) -> Result<i64>;
pub struct CallEdge { pub id: i64, pub caller_id: i64, pub callee_id: i64 }
```

These use the library's existing SQLx/anyhow/serde stack. No new runtime
dependency is introduced. A generated entity writer begins a transaction,
interns its string inputs, writes the fact, and commits. Called inside an
existing SQLx transaction, it uses a savepoint; the caller retains commit
authority. Failure rolls back that writer's dictionary additions and fact write.
The standalone `intern_*` helper uses its supplied connection's transaction.

Dictionary lookup uses `INSERT ... ON CONFLICT(value) DO NOTHING`, followed by
`SELECT id`. Repeated strings do not cause an UPDATE on the dictionary, avoiding
spurious update-trigger events. IDs are database-local. No process-global string
cache is generated. Enable `foreign_keys` on every SQLite connection, and set
the application's busy timeout/retry policy for concurrent writers.

## Equality and scope

- One pool per annotated scalar declaration. Distinct annotated scalars have
  separate pools even when values match.
- An unannotated derived scalar shares its nearest annotated ancestor's pool;
  annotating the derived scalar starts a separate pool.
- Exact SQLite BINARY text equality: no case folding or Unicode normalization.
- Nullable and optional scalar fields map to nullable integer columns. NULL
  does not become a dictionary entry. The empty string remains an ordinary value.
- Names remain authored, including case. Namespace qualification uses `__`;
  generated SQL name collisions are rejected, including SQLite case collisions.
- Interning text does not establish symbol identity. For scoped identities,
  declare the scope relation and composite unique key explicitly:

```typespec
model Scope { @Entity.pk id: integer; name: string; }
model ScopedSymbol {
  @Entity.pk id: integer;
  @Rel.belongsTo scope: Scope;
  @Entity.unique(ScopedSymbol.scope, ScopedSymbol.name)
  name: Symbol;
}
```

`ScopedSymbol(scope_id, name_id)` distinguishes two scopes sharing one spelling.
The scope argument is an existing integer ID; the name argument is a string.

## Emission and boundaries

Shared lowering is exported as `internStorage(program)`. `emitSQL` and `emitRust`
consume the same domain/column/key projection without mutating authored types.
An annotated scalar field opts its containing model into entity storage even
without a primary key. Model inheritance includes inherited properties.

The normal TypeSpec compilation hook emits `schema_auto.sql`, `intern_auto.rs`,
and the existing auto/manual-zone `generated.rs`, which re-exports the generated
intern module. Both `_auto` files carry render time, input hash, and source paths;
unchanged bodies are omitted from subsequent writes to preserve mtime. Existing
unannotated schemas retain their original output names and SQL. `noEmit` and
invalid declarations never publish output.

Use a fresh output directory when switching targets or schema generations.
This feature does not migrate existing databases or remove obsolete output files.
The dictionaries are append-only by convention; reclamation and durable identity
outside one database require application policy.

Current unsupported forms fail explicitly: interned arrays/multi-value unions;
interned primary keys, defaults or manual fields; composite primary keys;
non-integer reference target keys; `hasMany`/`manyToMany` inside interned entities;
custom sync strategies; `@Bind.from` adapters targeting interned entities.
Generated entity writers support zero or one integer primary key and composite
unique/index annotations. Upsert uses the first declared unique key when present.

Go interning writer generation is unsupported: `emitGo` rejects an interned
schema, and the compile hook emits SQL/Rust only with an explicit console notice.
Existing Go generation for unannotated schemas is retained. Extract's schema,
runtime and SQLite IVM plugin have not been migrated by this library change.

## Verification

```sh
pnpm --dir packages/binding-core build
pnpm --dir packages/binding-core test
```

Tests compile real TypeSpec fixtures, check the shared lowering and diagnostics,
and compile/run generated Rust against SQLite. The Rust test covers nullable
fields, exact-string round trips, dictionary separation, compound/scoped keys,
integer foreign keys, rollback, outer transactions, reopening, and eight
concurrent writers. It also asserts dictionary hits do not fire UPDATE triggers.
Cargo runs offline and needs the SQLx 0.8.6 test dependencies cached locally.
