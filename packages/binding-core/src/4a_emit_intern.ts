// Rust's string-input/integer-storage adapter for the shared interning plan.
import { quoteSql as q, type InternStorage } from "./2a_intern.js";
import { getSourceLocation, type Program } from "@typespec/compiler";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";

/** An unchanged auto file is omitted from the write tree, preserving its mtime. */
export function internAutoFile(program: Program, storage: InternStorage, body: string, existingFile?: string, fileName = "intern_auto.rs", comment = "//"): string | undefined {
  const sources = new Map([...storage.domains.map(d => d.scalar), ...storage.entities.map(e => e.model)].map(type => {
    const file = getSourceLocation(type).file;
    return [relative(program.projectRoot, file.path), file.text];
  }));
  const ordered = [...sources].sort(([a], [b]) => a.localeCompare(b));
  const hash = createHash("sha256").update(JSON.stringify(ordered)).update(body).digest("hex");
  if (existingFile) {
    try {
      const old = readFileSync(join(dirname(existingFile), fileName), "utf8");
      const marker = `${comment} Body\n`;
      const start = old.indexOf(marker);
      if (start >= 0 && old.slice(start + marker.length).trimEnd() === body.trimEnd()) return undefined;
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  }
  return `${comment} Rendered: ${new Date().toISOString()}\n${comment} Input SHA-256: ${hash}\n${comment} Sources: ${ordered.map(([path]) => path).join(", ")}\n${comment} Body\n${body}`;
}

export function emitInternRust(
  storage: InternStorage,
  rustType: (type: string, nullable: boolean) => string,
  ident: (name: string) => string,
): string {
  const lines = [
    "// Generated from TypeSpec @Entity.intern declarations. Do not edit.",
    "use anyhow::Result;", "use sqlx::{Connection, SqliteConnection};", "",
  ];
  for (const d of storage.domains) {
    lines.push(`pub async fn intern_${d.table}(conn: &mut SqliteConnection, value: &str) -> Result<i64> {`,
      `    sqlx::query(${JSON.stringify(`INSERT INTO ${q(d.table)} (value) VALUES (?) ON CONFLICT(value) DO NOTHING`)})`,
      `        .bind(value).execute(&mut *conn).await?;`,
      `    Ok(sqlx::query_scalar(${JSON.stringify(`SELECT id FROM ${q(d.table)} WHERE value = ?`)})`,
      `        .bind(value).fetch_one(&mut *conn).await?)`, `}`, "");
  }
  for (const e of storage.entities) {
    const key = e.fields.find(f => f.isPk);
    const fields = e.fields.filter(f => !f.isPk);
    const used = new Set(e.fields.flatMap(f => [f.name, f.column]));
    const local = (base: string) => {
      let name = base;
      while (used.has(name)) name += "_";
      used.add(name);
      return name;
    };
    const connection = local("conn"), transaction = local("tx"), inserted = local("inserted"), result = local("id");
    lines.push(`#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]`, `pub struct ${ident(e.table)} {`);
    for (const f of e.fields) lines.push(`    pub ${ident(f.column)}: ${f.domain || f.reference ? f.nullable ? "Option<i64>" : "i64" : rustType(f.typeName, f.nullable)},`);
    lines.push(`}`, "", `pub async fn upsert_${e.table}(`, `    ${connection}: &mut SqliteConnection,`);
    for (const f of fields) {
      const ty = f.reference ? f.nullable ? "Option<i64>" : "i64" : rustType(f.typeName, f.nullable);
      lines.push(`    ${ident(f.reference ? f.column : f.name)}: ${ty === "String" ? "&str" : ty === "Option<String>" ? "Option<&str>" : ty},`);
    }
    lines.push(`) -> Result<${key ? "i64" : "()"}> {`, `    let mut ${transaction} = ${connection}.begin().await?;`);
    for (const f of fields.filter(f => f.domain)) {
      const call = `intern_${f.domain!.table}(&mut ${transaction}, value).await?`;
      lines.push(`    let ${ident(f.column)} = ${f.nullable
        ? `match ${ident(f.name)} { Some(value) => Some(${call}), None => None }`
        : `intern_${f.domain!.table}(&mut ${transaction}, ${ident(f.name)}).await?`};`);
    }
    let sql = `INSERT INTO ${q(e.table)} (${fields.map(f => q(f.column)).join(", ")}) VALUES (${fields.map(() => "?").join(", ")})`;
    const conflict = e.unique[0];
    const updates = fields.filter(f => !conflict?.includes(f.column));
    if (conflict) sql += ` ON CONFLICT (${conflict.map(q).join(", ")}) DO ${updates.length ? `UPDATE SET ${updates.map(f => `${q(f.column)} = excluded.${q(f.column)}`).join(", ")}` : "NOTHING"}`;
    if (key) sql += ` RETURNING ${q(key.column)}`;
    lines.push(`    ${key ? `let ${inserted}: Option<i64> = sqlx::query_scalar` : "sqlx::query"}(${JSON.stringify(sql)})`);
    for (const f of fields) lines.push(`        .bind(&${ident(f.domain || f.reference ? f.column : f.name)})`);
    lines.push(`        .${key ? "fetch_optional" : "execute"}(&mut *${transaction}).await?;`);
    if (key) {
      if (conflict && !updates.length) {
        const select = `SELECT ${q(key.column)} FROM ${q(e.table)} WHERE ${conflict.map(c => `${q(c)} IS ?`).join(" AND ")}`;
        lines.push(`    let ${result} = match ${inserted} {`, `        Some(id) => id,`, `        None => sqlx::query_scalar(${JSON.stringify(select)})`);
        for (const c of conflict) lines.push(`            .bind(&${ident(c)})`);
        lines.push(`            .fetch_one(&mut *${transaction}).await?,`, `    };`);
      } else lines.push(`    let ${result} = ${inserted}.ok_or_else(|| anyhow::anyhow!("insert did not return an id"))?;`);
    }
    lines.push(`    ${transaction}.commit().await?;`, `    Ok(${key ? result : "()"})`, `}`, "");
  }
  return lines.join("\n");
}
