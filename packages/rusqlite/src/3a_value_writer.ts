import type { Program } from "@typespec/compiler";
import {
  collectModels,
  getAllRelations,
  internStorage,
  isEntityModel,
  resolvedFields,
  snakeCase,
  sqliteDialect,
  type SqlDialect,
} from "@hafley/typespec-sql";

export interface RusqliteValueWriterOptions {
  dialect?: SqlDialect;
}

/** Emit a positional rusqlite writer for ordinary entity models.
 *
 * The caller owns value validation and transaction scope. SQLite reports a
 * parameter-count error when `values` does not match the generated columns.
 */
export function emitRusqliteValueWriters(
  program: Program,
  options: RusqliteValueWriterOptions = {},
): string {
  const dialect = options.dialect ?? sqliteDialect;
  if (dialect.name !== "sqlite") {
    throw new Error(`rusqlite value writers support only the sqlite dialect, received ${dialect.name}`);
  }
  const storage = internStorage(program);
  const relations = getAllRelations(program);
  const entities = collectModels(program.getGlobalNamespaceType())
    .filter((model) => isEntityModel(program, model) && !storage.entities.some((entity) => entity.model === model));
  const quote = dialect.quoteIdentifier.bind(dialect);
  const arms = entities.map((model) => {
    const table = snakeCase(model.name);
    const columns = resolvedFields(program, model, relations)
      .filter((field) => !field.isManual)
      .map((field) => field.rel ? `${snakeCase(field.name)}_id` : snakeCase(field.name));
    const placeholders = columns.map((_, index) => dialect.placeholder(index + 1));
    const sql = columns.length
      ? `INSERT INTO ${quote(table)} (${columns.map(quote).join(", ")}) VALUES (${placeholders.join(", ")})`
      : `INSERT INTO ${quote(table)} DEFAULT VALUES`;
    return `        ${JSON.stringify(table)} => conn.prepare_cached(${JSON.stringify(sql)})?.execute(rusqlite::params_from_iter(values)),`;
  });
  return [
    "// Generated positional SQLite writers. Do not edit.",
    "pub fn insert_values(",
    "    conn: &rusqlite::Connection,",
    "    table: &str,",
    "    values: &[rusqlite::types::Value],",
    ") -> rusqlite::Result<usize> {",
    "    match table {",
    ...arms,
    "        _ => Err(rusqlite::Error::InvalidParameterName(table.to_owned())),",
    "    }",
    "}",
    "",
  ].join("\n");
}
