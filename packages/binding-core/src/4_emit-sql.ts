import type { Program } from "@typespec/compiler";
import { emitSQLFromStorage, sqliteDialect, type SqlDialect } from "@hafley/typespec-sql";
import { internStorage } from "./2a_intern.js";

/** Backwards-compatible SQL facade that retains binding-core adapter validation. */
export function emitSQL(program: Program, dialect: SqlDialect = sqliteDialect): string {
  return emitSQLFromStorage(program, internStorage(program), dialect);
}

export { sqliteDialect };
export type { SqlDialect };
