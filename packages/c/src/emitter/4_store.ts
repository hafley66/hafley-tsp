import { type Namespace, type Program } from "@typespec/compiler";
import { emitSQL, quoteSql, sqliteDialect, tableFacts, type TableColumn, type TableFact } from "@hafley/typespec-sql";
import { assertDistinctIdentifiers, cIdentifier } from "../c/0_name-policy.js";
import type { CFile } from "./2_emit.js";

export function cString(value: string): string {
  return '"' + [...Buffer.from(value)].map(b => b === 34 ? '\\"' : b === 92 ? '\\\\' : b < 32 || b > 126 ? '\\' + b.toString(8).padStart(3, "0") : String.fromCharCode(b)).join("") + '"';
}
export function namespacePath(ns: Namespace | undefined): string {
  const segments: string[] = [];
  for (; ns?.name; ns = ns.namespace) segments.unshift(cIdentifier(ns.name));
  return segments.join("/");
}
export function namespaceSymbol(path: string): string { return path ? path.replaceAll("/", "_") : "global"; }

type StorageKind = "text" | "integer" | "real" | "blob";
function kind(column: TableColumn): StorageKind {
  const sql = sqliteDialect.scalarType(column.typeName);
  if (sql === "INTEGER") return "integer";
  if (sql === "REAL") return "real";
  if (sql === "BLOB") return "blob";
  return "text";
}
function rowFields(table: TableFact): string {
  assertDistinctIdentifiers(table.columns.flatMap(c => [c.name, ...(c.nullable ? [`has_${c.name}`] : []), ...(kind(c) === "blob" ? [`${c.name}_size`] : [])]), table.name);
  return table.columns.map(c => {
    const name = cIdentifier(c.name);
    const type = { text: "char *", integer: "int64_t", real: "double", blob: "unsigned char *" }[kind(c)];
    return `${c.nullable ? `  bool has_${name};\n` : ""}  ${type} ${name};\n${kind(c) === "blob" ? `  size_t ${name}_size;\n` : ""}`;
  }).join("") || "  unsigned char _empty;\n";
}
function bind(c: TableColumn, index: number): string {
  const name = cIdentifier(c.name), value = `row->${name}`;
  let call: string;
  switch (kind(c)) {
    case "text": call = `${value} ? sqlite3_bind_text(stmt, ${index}, ${value}, -1, SQLITE_TRANSIENT) : SQLITE_MISUSE`; break;
    case "integer": call = `sqlite3_bind_int64(stmt, ${index}, ${value})`; break;
    case "real": call = `sqlite3_bind_double(stmt, ${index}, ${value})`; break;
    case "blob": call = `sqlite3_bind_blob64(stmt, ${index}, ${value} ? (const void *)${value} : (const void *)"", row->${name}_size, SQLITE_TRANSIENT)`; break;
  }
  return `  rc = ${c.nullable ? `!row->has_${name} ? sqlite3_bind_null(stmt, ${index}) : ` : ""}${call};\n  if (rc != SQLITE_OK) goto done;\n`;
}
function readColumn(c: TableColumn, index: number): string {
  const name = cIdentifier(c.name), value = `row.${name}`;
  let read: string;
  switch (kind(c)) {
    case "integer": read = `    ${value} = sqlite3_column_int64(stmt, ${index});\n`; break;
    case "real": read = `    ${value} = sqlite3_column_double(stmt, ${index});\n`; break;
    case "text": read = `    const char *text_${index} = (const char *)sqlite3_column_text(stmt, ${index});\n    if (!text_${index}) { rc = SQLITE_NOMEM; goto done; }\n    ${value} = mi_heap_strdup(arena, text_${index});\n    if (!${value}) { rc = SQLITE_NOMEM; goto done; }\n`; break;
    case "blob": read = `    row.${name}_size = (size_t)sqlite3_column_bytes(stmt, ${index});\n    ${value} = mi_heap_malloc(arena, row.${name}_size ? row.${name}_size : 1);\n    if (!${value}) { rc = SQLITE_NOMEM; goto done; }\n    if (row.${name}_size) memcpy(${value}, sqlite3_column_blob(stmt, ${index}), row.${name}_size);\n`; break;
  }
  return c.nullable ? `    row.has_${name} = sqlite3_column_type(stmt, ${index}) != SQLITE_NULL;\n    if (row.has_${name}) {\n${read}    }\n` : `    if (sqlite3_column_type(stmt, ${index}) == SQLITE_NULL) { rc = SQLITE_MISMATCH; goto done; }\n${read}`;
}
export function emitStore(program: Program): CFile[] {
  const groups = new Map<string, TableFact[]>();
  for (const table of tableFacts(program)) {
    const ns = namespacePath(table.namespace);
    const group = groups.get(ns) ?? [];
    group.push(table); groups.set(ns, group);
  }
  const ddl = emitSQL(program); // Identical SQLite rendering to the SQL emitter.
  return [...groups].flatMap(([ns, tables]) => {
    const prefix = namespaceSymbol(ns), path = ns ? `${ns}/` : "";
    const names = tables.map(t => cIdentifier(t.name));
    assertDistinctIdentifiers(names, `${ns} store`);
    const header = `#pragma once\n#include <stdbool.h>\n#include <stddef.h>\n#include <stdint.h>\n#include <sqlite3.h>\n#include <mimalloc.h>\n\nextern const char ${prefix}_ddl[];\n` + tables.map((table, i) => {
      const name = `${prefix}_${names[i]}`;
      return `typedef struct ${name}_row {\n${rowFields(table)}} ${name}_row;\nint ${name}_insert(sqlite3 *db, const ${name}_row *row);\nint ${name}_select(sqlite3 *db, mi_heap_t *arena, ${name}_row **rows, size_t *count);\n`;
    }).join("\n");
    const source = `#include "store_auto.h"\n#include <string.h>\n\nconst char ${prefix}_ddl[] = ${cString(ddl)};\n\n` + tables.map((table, i) => {
      const name = `${prefix}_${names[i]}`, columns = table.columns.map(c => quoteSql(c.name)).join(", ");
      if (!table.columns.length) throw new Error(`Empty store table: ${table.name}`);
      const insert = `INSERT INTO ${quoteSql(table.name)} (${columns}) VALUES (${table.columns.map(() => "?").join(", ")})`;
      const select = `SELECT ${columns} FROM ${quoteSql(table.name)}`;
      return `int ${name}_insert(sqlite3 *db, const ${name}_row *row) {\n  if (!db || !row) return SQLITE_MISUSE;\n  sqlite3_stmt *stmt = NULL;\n  int rc = sqlite3_prepare_v2(db, ${cString(insert)}, -1, &stmt, NULL);\n  if (rc != SQLITE_OK) goto done;\n${table.columns.map((c, j) => bind(c, j + 1)).join("")}  rc = sqlite3_step(stmt);\n  if (rc == SQLITE_DONE) rc = SQLITE_OK;\ndone:\n  { int final = sqlite3_finalize(stmt); return rc == SQLITE_OK ? final : rc; }\n}\n\nint ${name}_select(sqlite3 *db, mi_heap_t *arena, ${name}_row **rows, size_t *count) {\n  if (!db || !arena || !rows || !count) return SQLITE_MISUSE;\n  *rows = NULL; *count = 0;\n  ${name}_row *data = NULL;\n  size_t used = 0, capacity = 0;\n  sqlite3_stmt *stmt = NULL;\n  int rc = sqlite3_prepare_v2(db, ${cString(select)}, -1, &stmt, NULL);\n  if (rc != SQLITE_OK) goto done;\n  while ((rc = sqlite3_step(stmt)) == SQLITE_ROW) {\n    ${name}_row row = {0};\n${table.columns.map(readColumn).join("")}    if (used == capacity) {\n      if (capacity > SIZE_MAX / 2 / sizeof(*data)) { rc = SQLITE_TOOBIG; goto done; }\n      size_t next = capacity ? capacity * 2 : 16;\n      ${name}_row *grown = mi_heap_realloc(arena, data, next * sizeof(*data));\n      if (!grown) { rc = SQLITE_NOMEM; goto done; }\n      data = grown; capacity = next;\n    }\n    data[used++] = row;\n  }\n  if (rc == SQLITE_DONE) rc = SQLITE_OK;\ndone:\n  { int final = sqlite3_finalize(stmt); if (rc == SQLITE_OK) rc = final; }\n  if (rc == SQLITE_OK) { *rows = data; *count = used; }\n  return rc;\n}\n`;
    }).join("\n");
    return [{ path: `${path}store_auto.h`, contents: header }, { path: `${path}store_auto.c`, contents: source }];
  });
}
