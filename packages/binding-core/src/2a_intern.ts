import type { Program } from "@typespec/compiler";
import {
  collectModels,
  internStorage as coreInternStorage,
  quoteSql,
  sqliteDialect,
  type InternDomain,
  type InternEntity,
  type InternField,
  type InternStorage,
} from "@hafley/typespec-sql";
import { validateSqlxStorage } from "@hafley/typespec-sqlx";
import { getBinding, hasBinding, hasSyncStrategy } from "./decorators.js";

/** Legacy binding-core projection with its SQLx/Rust and binding checks retained. */
export function internStorage(program: Program): InternStorage {
  const storage = coreInternStorage(program);
  const models = collectModels(program.getGlobalNamespaceType());
  const fail = (reason: string): never => { throw new Error(`Invalid interning declaration: ${reason}`); };

  for (const entity of storage.entities) {
    if (hasSyncStrategy(program, entity.model)) fail(`${entity.model.name}: custom sync strategies are not supported for interned entities`);
  }
  try {
    validateSqlxStorage(storage, sqliteDialect);
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
  for (const model of models.filter((candidate) => hasBinding(program, candidate))) {
    const target = getBinding(program, model)!.targetModel;
    if (storage.entities.some((entity) => entity.model === target)) fail(`${model.name}: @Bind.from to an interned entity is not supported yet`);
  }
  return storage;
}

export { quoteSql };
export type { InternDomain, InternEntity, InternField, InternStorage };
