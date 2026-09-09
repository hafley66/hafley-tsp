import type { InternStorage, SqlDialect } from "@hafley/typespec-sql";
import { sqliteDialect } from "@hafley/typespec-sql";
import { validateSqlxStorage } from "./1_validate.js";

export function emitInternRust(
  storage: InternStorage,
  rustType: (type: string, nullable: boolean) => string,
  ident: (name: string) => string,
  dialect: SqlDialect = sqliteDialect,
): string {
  validateSqlxStorage(storage, dialect);
  const quote = dialect.quoteIdentifier.bind(dialect);
  const placeholder = dialect.placeholder(1);
  const lines = [
    "// Generated from TypeSpec @Entity.intern declarations. Do not edit.",
    "use anyhow::Result;", "use sqlx::{Connection, SqliteConnection};", "",
  ];
  for (const domain of storage.domains) {
    const insert = `INSERT INTO ${quote(domain.table)} (value) VALUES (${placeholder}) ON CONFLICT(value) DO NOTHING`;
    const select = `SELECT id FROM ${quote(domain.table)} WHERE value = ${placeholder}`;
    lines.push(`pub async fn intern_${domain.table}(conn: &mut SqliteConnection, value: &str) -> Result<i64> {`,
      `    sqlx::query(${JSON.stringify(insert)})`, `        .bind(value).execute(&mut *conn).await?;`,
      `    Ok(sqlx::query_scalar(${JSON.stringify(select)})`, `        .bind(value).fetch_one(&mut *conn).await?)`, `}`, "");
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
    const transaction = local("tx");
    const inserted = local("inserted");
    const result = local("id");
    lines.push("#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]", `pub struct ${ident(entity.table)} {`);
    for (const field of entity.fields) {
      const type = field.domain || field.reference ? field.nullable ? "Option<i64>" : "i64" : rustType(field.typeName, field.nullable);
      lines.push(`    pub ${ident(field.column)}: ${type},`);
    }
    lines.push("}", "", `pub async fn upsert_${entity.table}(`, `    ${connection}: &mut SqliteConnection,`);
    for (const field of fields) {
      const type = field.reference ? field.nullable ? "Option<i64>" : "i64" : rustType(field.typeName, field.nullable);
      lines.push(`    ${ident(field.reference ? field.column : field.name)}: ${type === "String" ? "&str" : type === "Option<String>" ? "Option<&str>" : type},`);
    }
    lines.push(`) -> Result<${key ? "i64" : "()"}> {`, `    let mut ${transaction} = ${connection}.begin().await?;`);
    for (const field of fields.filter((candidate) => candidate.domain)) {
      const call = `intern_${field.domain!.table}(&mut ${transaction}, value).await?`;
      lines.push(`    let ${ident(field.column)} = ${field.nullable ? `match ${ident(field.name)} { Some(value) => Some(${call}), None => None }` : `intern_${field.domain!.table}(&mut ${transaction}, ${ident(field.name)}).await?`};`);
    }
    let sql = `INSERT INTO ${quote(entity.table)} (${fields.map((field) => quote(field.column)).join(", ")}) VALUES (${fields.map((_, index) => dialect.placeholder(index + 1)).join(", ")})`;
    const conflict = entity.unique[0];
    const updates = fields.filter((field) => !conflict?.includes(field.column));
    if (conflict) sql += dialect.conflictClause(conflict, updates.map((field) => field.column));
    if (key) sql += dialect.returningClause(key.column);
    lines.push(`    ${key ? `let ${inserted}: Option<i64> = sqlx::query_scalar` : "sqlx::query"}(${JSON.stringify(sql)})`);
    for (const field of fields) lines.push(`        .bind(&${ident(field.domain || field.reference ? field.column : field.name)})`);
    lines.push(`        .${key ? "fetch_optional" : "execute"}(&mut *${transaction}).await?;`);
    if (key) {
      if (conflict && !updates.length) {
        const select = `SELECT ${quote(key.column)} FROM ${quote(entity.table)} WHERE ${conflict.map((column, index) => dialect.nullSafeEquals(column, dialect.placeholder(index + 1))).join(" AND ")}`;
        lines.push(`    let ${result} = match ${inserted} {`, "        Some(id) => id,", `        None => sqlx::query_scalar(${JSON.stringify(select)})`);
        for (const column of conflict) lines.push(`            .bind(&${ident(column)})`);
        lines.push(`            .fetch_one(&mut *${transaction}).await?,`, "    };");
      } else {
        lines.push(`    let ${result} = ${inserted}.ok_or_else(|| anyhow::anyhow!("insert did not return an id"))?;`);
      }
    }
    lines.push(`    ${transaction}.commit().await?;`, `    Ok(${key ? result : "()"})`, "}", "");
  }
  return lines.join("\n");
}
