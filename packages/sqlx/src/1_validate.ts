import type { Model } from "@typespec/compiler";
import type { InternStorage, SqlDialect } from "@hafley/typespec-sql";

export type SqlxStrategy = "upsert" | "insert-ignore" | "delete-replace";

function validRustIdentifier(name: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name) && !["self", "Self", "super", "crate"].includes(name);
}

export function validateSqlxStorage(
  storage: InternStorage,
  dialect: SqlDialect,
  strategyForModel: (model: Model) => SqlxStrategy = () => "upsert",
): void {
  if (dialect.name !== "sqlite") throw new Error(`SQLx storage supports only the sqlite dialect, received ${dialect.name}`);
  for (const domain of storage.domains) {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(domain.table)) throw new Error(`${domain.table}: unsupported Rust domain identifier`);
  }
  for (const entity of storage.entities) {
    if (strategyForModel(entity.model) !== "upsert") throw new Error(`${entity.model.name}: custom sync strategies are not supported for interned entities`);
    if (!validRustIdentifier(entity.table)) throw new Error(`${entity.table}: unsupported Rust type identifier`);
    for (const field of entity.fields) {
      if (!validRustIdentifier(field.name)) throw new Error(`${entity.model.name}.${field.name}: unsupported Rust field identifier`);
    }
  }
}

export { AutoEmitterMarker, loadedAutoEmitters } from "@hafley/typespec-sql";
