// SQL schema emitter -- walks the TSP program graph directly via decorator accessors.

import type { Program } from "@typespec/compiler";
import {
  resolvedFields, collectModels, isEntityModel, snakeCase, resolveRelTarget,
  type ResolvedField,
} from "./2_facts.js";
import { isPk, getUnique, getIndex, getAllRelations } from "./decorators.js";

const TYPE_MAP: Record<string, string> = {
  string: "TEXT", integer: "INTEGER",
  int8: "INTEGER", int16: "INTEGER", int32: "INTEGER", int64: "INTEGER",
  uint8: "INTEGER", uint16: "INTEGER", uint32: "INTEGER", uint64: "INTEGER",
  float: "REAL", float32: "REAL", float64: "REAL", numeric: "NUMERIC",
  boolean: "INTEGER", bytes: "BLOB",
  plainDate: "TEXT", plainTime: "TEXT", utcDateTime: "TEXT",
  offsetDateTime: "TEXT", duration: "TEXT", url: "TEXT",
};

function sqlType(t: string): string { return TYPE_MAP[t] ?? "TEXT"; }

function colName(f: ResolvedField): string {
  return f.rel ? `${snakeCase(f.name)}_id` : snakeCase(f.name);
}

export function emitSQL(program: Program): string {
  const allModels = collectModels(program.getGlobalNamespaceType());
  const relMap = getAllRelations(program);
  const entities = allModels.filter(m => isEntityModel(program, m));

  // Pre-collect PKs for FK target resolution
  const pksByEntity = new Map<string, string[]>();
  for (const model of entities) {
    pksByEntity.set(model.name, resolvedFields(program, model, relMap).filter(f => f.isPk).map(f => f.name));
  }

  const lines: string[] = [];

  for (const model of entities) {
    const fields = resolvedFields(program, model, relMap);
    const pks = pksByEntity.get(model.name)!;
    const isComposite = pks.length > 1;
    const table = snakeCase(model.name);
    const colDefs: string[] = [];

    for (const f of fields) {
      const col = colName(f);

      if (f.rel?.kind === "belongsTo") {
        const target = resolveRelTarget(f.rel);
        const parts = [col, "INTEGER"];
        if (!f.nullable) parts.push("NOT NULL");
        if (f.isPk && !isComposite) parts.push("PRIMARY KEY");
        parts.push(`REFERENCES ${snakeCase(target)}(${(pksByEntity.get(target) ?? ["id"])[0]})`);
        if (f.default) parts.push(`DEFAULT ${f.default}`);
        colDefs.push("    " + parts.join(" "));
        continue;
      }

      const parts = [col, sqlType(f.typeName)];
      if (f.isPk && !isComposite) {
        parts.push(sqlType(f.typeName) === "INTEGER" ? "PRIMARY KEY AUTOINCREMENT" : "PRIMARY KEY");
      } else {
        if (!f.nullable) parts.push("NOT NULL");
        if (f.default) parts.push(`DEFAULT ${f.default}`);
      }
      colDefs.push("    " + parts.join(" "));
    }

    if (isComposite) {
      const pkCols = pks.map(p => { const f = fields.find(fv => fv.name === p); return f?.rel ? `${snakeCase(p)}_id` : snakeCase(p); });
      colDefs.push(`    PRIMARY KEY (${pkCols.join(", ")})`);
    }

    for (const [, prop] of model.properties) {
      for (const u of (getUnique(program, prop) ?? [])) {
        const cols = u.fields.map(n => { const f = fields.find(fv => fv.name === n); return f?.rel ? `${snakeCase(n)}_id` : snakeCase(n); });
        colDefs.push(`    UNIQUE(${cols.join(", ")})`);
      }
    }

    lines.push(`CREATE TABLE IF NOT EXISTS ${table} (`, colDefs.join(",\n"), `);\n`);
  }

  for (const model of entities) {
    const fields = resolvedFields(program, model, relMap);
    const table = snakeCase(model.name);
    for (const [, prop] of model.properties) {
      for (const idx of (getIndex(program, prop) ?? [])) {
        const cols = idx.fields.map(n => { const f = fields.find(fv => fv.name === n); return f?.rel ? `${snakeCase(n)}_id` : snakeCase(n); });
        lines.push(`CREATE INDEX IF NOT EXISTS idx_${table}_${cols.join("_")} ON ${table}(${cols.join(", ")});`);
      }
    }
  }

  return lines.join("\n") + "\n";
}
