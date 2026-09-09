import { sqliteDialect, type InternStorage, type SqlDialect } from "@hafley/typespec-sql";
import { validateRusqliteStorage } from "./1_validate.js";

export function emitWriteConnectionTrait(): string {
  return `/// A connection-like owner that can open one nested native SQLite savepoint.
pub trait RusqliteWriteConnection {
    fn begin_write(&mut self) -> rusqlite::Result<rusqlite::Savepoint<'_>>;
}

impl RusqliteWriteConnection for rusqlite::Connection {
    fn begin_write(&mut self) -> rusqlite::Result<rusqlite::Savepoint<'_>> {
        rusqlite::Connection::savepoint(self)
    }
}

impl RusqliteWriteConnection for rusqlite::Transaction<'_> {
    fn begin_write(&mut self) -> rusqlite::Result<rusqlite::Savepoint<'_>> {
        rusqlite::Transaction::savepoint(self)
    }
}

impl RusqliteWriteConnection for rusqlite::Savepoint<'_> {
    fn begin_write(&mut self) -> rusqlite::Result<rusqlite::Savepoint<'_>> {
        rusqlite::Savepoint::savepoint(self)
    }
}`;
}

export function emitInternRusqlite(
  storage: InternStorage,
  rustType: (type: string, nullable: boolean) => string,
  ident: (name: string) => string,
  dialect: SqlDialect = sqliteDialect,
  includeTrait = true,
): string {
  validateRusqliteStorage(storage, dialect);
  const quote = dialect.quoteIdentifier.bind(dialect);
  const placeholder = dialect.placeholder(1);
  const lines = [
    "// Generated from TypeSpec @Entity.intern declarations. Do not edit.",
    "use rusqlite::{Connection, OptionalExtension, params};",
    "",
    includeTrait ? emitWriteConnectionTrait() : "use super::RusqliteWriteConnection;",
    "",
  ];
  for (const domain of storage.domains) {
    lines.push(`pub fn intern_${domain.table}(conn: &Connection, value: &str) -> rusqlite::Result<i64> {`,
      `    conn.execute(${JSON.stringify(`INSERT INTO ${quote(domain.table)} (value) VALUES (${placeholder}) ON CONFLICT(value) DO NOTHING`)}, params![value])?;`,
      `    conn.query_row(${JSON.stringify(`SELECT id FROM ${quote(domain.table)} WHERE value = ${placeholder}`)}, params![value], |row| row.get(0))`,
      "}", "");
  }
  for (const entity of storage.entities) {
    const key = entity.fields.find((field) => field.isPk);
    const fields = entity.fields.filter((field) => !field.isPk);
    const used = new Set(entity.fields.flatMap((field) => [field.name, field.column]));
    const local = (base: string) => {
      let name = base;
      while (used.has(name)) name += "_";
      used.add(name);
      return name;
    };
    const connection = local("conn");
    const savepoint = local("tx");
    const inserted = local("inserted");
    const result = local("id");
    lines.push("#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]", `pub struct ${ident(entity.table)} {`);
    for (const field of entity.fields) {
      const type = field.domain || field.reference ? field.nullable ? "Option<i64>" : "i64" : rustType(field.typeName, field.nullable);
      lines.push(`    pub ${ident(field.column)}: ${type},`);
    }
    lines.push("}", "", `pub fn upsert_${entity.table}<C: RusqliteWriteConnection + ?Sized>(`, `    ${connection}: &mut C,`);
    for (const field of fields) {
      const type = field.reference ? field.nullable ? "Option<i64>" : "i64" : rustType(field.typeName, field.nullable);
      lines.push(`    ${ident(field.reference ? field.column : field.name)}: ${type === "String" ? "&str" : type === "Option<String>" ? "Option<&str>" : type},`);
    }
    lines.push(`) -> rusqlite::Result<${key ? "i64" : "()"}> {`, `    let mut ${savepoint} = ${connection}.begin_write()?;`);
    for (const field of fields.filter((candidate) => candidate.domain)) {
      const call = `intern_${field.domain!.table}(&${savepoint}, value)?`;
      lines.push(`    let ${ident(field.column)} = ${field.nullable ? `match ${ident(field.name)} { Some(value) => Some(${call}), None => None }` : `intern_${field.domain!.table}(&${savepoint}, ${ident(field.name)})?`};`);
    }
    const placeholders = fields.map((_, index) => dialect.placeholder(index + 1));
    let sql = fields.length
      ? `INSERT INTO ${quote(entity.table)} (${fields.map((field) => quote(field.column)).join(", ")}) VALUES (${placeholders.join(", ")})`
      : `INSERT INTO ${quote(entity.table)} DEFAULT VALUES`;
    const conflict = entity.unique[0];
    const updates = fields.filter((field) => !conflict?.includes(field.column));
    if (conflict) sql += dialect.conflictClause(conflict, updates.map((field) => field.column));
    if (key) sql += dialect.returningClause(key.column);
    const params = `params![${fields.map((field) => ident(field.domain || field.reference ? field.column : field.name)).join(", ")}]`;
    if (key) lines.push(`    let ${inserted}: Option<i64> = ${savepoint}.query_row(${JSON.stringify(sql)}, ${params}, |row| row.get(0)).optional()?;`);
    else lines.push(`    ${savepoint}.execute(${JSON.stringify(sql)}, ${params})?;`);
    if (key) {
      if (conflict && !updates.length) {
        const select = `SELECT ${quote(key.column)} FROM ${quote(entity.table)} WHERE ${conflict.map((column, index) => dialect.nullSafeEquals(column, dialect.placeholder(index + 1))).join(" AND ")}`;
        lines.push(`    let ${result} = match ${inserted} {`, "        Some(id) => id,", `        None => ${savepoint}.query_row(${JSON.stringify(select)}, params![${conflict.map(ident).join(", ")}], |row| row.get(0))?,`, "    };");
      } else {
        lines.push(`    let ${result} = ${inserted}.ok_or(rusqlite::Error::QueryReturnedNoRows)?;`);
      }
    }
    lines.push(`    ${savepoint}.commit()?;`, `    Ok(${key ? result : "()"})`, "}", "");
  }
  return lines.join("\n");
}
