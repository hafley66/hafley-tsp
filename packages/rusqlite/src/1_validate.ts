import type { Model } from "@typespec/compiler";
import type { InternStorage, ResolvedField, SqlDialect } from "@hafley/typespec-sql";

export type RusqliteStrategy = "upsert" | "insert-ignore" | "delete-replace";

function validRustIdentifier(name: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name) && !["self", "Self", "super", "crate"].includes(name);
}

export function validateRusqliteStorage(
  storage: InternStorage,
  dialect: SqlDialect,
  ordinary: Array<{ model: Model; fields: ResolvedField[] }> = [],
  strategyForModel: (model: Model) => RusqliteStrategy = () => "upsert",
): void {
  if (dialect.name !== "sqlite") throw new Error(`rusqlite storage supports only the sqlite dialect, received ${dialect.name}`);
  for (const domain of storage.domains) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(domain.table)) throw new Error(`${domain.table}: unsupported Rust domain identifier`);
  }
  for (const entity of storage.entities) {
    if (strategyForModel(entity.model) !== "upsert") throw new Error(`${entity.model.name}: custom strategies are not supported for interned entities`);
    if (!validRustIdentifier(entity.table)) throw new Error(`${entity.table}: unsupported Rust type identifier`);
    for (const field of entity.fields) if (!validRustIdentifier(field.name)) throw new Error(`${entity.model.name}.${field.name}: unsupported Rust field identifier`);
  }
  for (const { model, fields } of ordinary) {
    if (!validRustIdentifier(model.name)) throw new Error(`${model.name}: unsupported Rust type identifier`);
    for (const field of fields) {
      if (!validRustIdentifier(field.name)) throw new Error(`${model.name}.${field.name}: unsupported Rust field identifier`);
      if (["uint64"].includes(field.typeName)) throw new Error(`${model.name}.${field.name}: unsupported rusqlite input scalar ${field.typeName}`);
    }
  }
}
