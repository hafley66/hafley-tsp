// SQL schema emitter -- consumes FactDB, produces CREATE TABLE / CREATE INDEX statements.
// Handles FK resolution, composite PKs, defaults, dot-path column naming, type mapping.

import type { FactDB } from "./2_facts.js";

// ── Type mapping ──────────────────────────────────────────

const TYPE_MAP: Record<string, string> = {
  string: "TEXT",
  integer: "INTEGER",
  int8: "INTEGER",
  int16: "INTEGER",
  int32: "INTEGER",
  int64: "INTEGER",
  uint8: "INTEGER",
  uint16: "INTEGER",
  uint32: "INTEGER",
  uint64: "INTEGER",
  float: "REAL",
  float32: "REAL",
  float64: "REAL",
  numeric: "NUMERIC",
  boolean: "INTEGER",
  bytes: "BLOB",
  plainDate: "TEXT",
  plainTime: "TEXT",
  utcDateTime: "TEXT",
  offsetDateTime: "TEXT",
  duration: "TEXT",
  url: "TEXT",
};

function sqlType(tspType: string): string {
  return TYPE_MAP[tspType] ?? "TEXT";
}

function snakeCase(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/\./g, "_")
    .toLowerCase();
}

// ── Main emitter ──────────────────────────────────────────

export function emitSQL(db: FactDB): string {
  const lines: string[] = [];

  // Build lookup indexes
  const pksByEntity = new Map<string, string[]>();
  for (const pk of db.pks) {
    if (!pksByEntity.has(pk.entity)) pksByEntity.set(pk.entity, []);
    pksByEntity.get(pk.entity)!.push(pk.field);
  }

  const relsByEntityField = new Map<string, { kind: string; target: string }>();
  for (const rel of db.relations) {
    relsByEntityField.set(`${rel.entity}.${rel.field}`, { kind: rel.kind, target: rel.target });
  }

  const defaultsByEntityField = new Map<string, string>();
  for (const d of db.defaults) {
    defaultsByEntityField.set(`${d.entity}.${d.field}`, d.value);
  }

  const uniquesByEntity = new Map<string, string[][]>();
  for (const u of db.uniques) {
    if (!uniquesByEntity.has(u.entity)) uniquesByEntity.set(u.entity, []);
    uniquesByEntity.get(u.entity)!.push(u.fields);
  }

  // Emit tables in entity order
  for (const entity of db.entities) {
    const tableName = snakeCase(entity.name);
    const pks = pksByEntity.get(entity.name) ?? [];
    const isCompositePk = pks.length > 1;
    const fields = db.fields.filter((f) => f.entity === entity.name);

    const colDefs: string[] = [];

    for (const field of fields) {
      const rel = relsByEntityField.get(`${entity.name}.${field.name}`);
      const isPk = pks.includes(field.name);
      const defaultVal = defaultsByEntityField.get(`${entity.name}.${field.name}`);
      const colName = rel ? `${snakeCase(field.name)}_id` : snakeCase(field.name);

      if (rel && rel.kind === "belongsTo") {
        // FK column: resolve to target's PK type (always INTEGER for autoincrement targets)
        const targetTable = snakeCase(rel.target);
        const targetPks = pksByEntity.get(rel.target) ?? ["id"];
        const targetPk = targetPks[0]; // FK points to target's first PK
        const parts = [`${colName}`, "INTEGER"];
        if (!field.nullable) parts.push("NOT NULL");
        if (isPk && !isCompositePk) {
          // Single PK that's also a FK -- unusual but valid
          parts.push("PRIMARY KEY");
        }
        parts.push(`REFERENCES ${targetTable}(${targetPk})`);
        if (defaultVal) parts.push(`DEFAULT ${defaultVal}`);
        colDefs.push("    " + parts.join(" "));
        continue;
      }

      const parts = [colName, sqlType(field.type)];

      if (isPk && !isCompositePk) {
        parts.push(sqlType(field.type) === "INTEGER" ? "PRIMARY KEY AUTOINCREMENT" : "PRIMARY KEY");
      } else {
        if (!field.nullable) parts.push("NOT NULL");
        if (defaultVal) parts.push(`DEFAULT ${defaultVal}`);
      }

      colDefs.push("    " + parts.join(" "));
    }

    // Composite PK
    if (isCompositePk) {
      const pkCols = pks.map((p) => {
        const rel = relsByEntityField.get(`${entity.name}.${p}`);
        return rel ? `${snakeCase(p)}_id` : snakeCase(p);
      });
      colDefs.push(`    PRIMARY KEY (${pkCols.join(", ")})`);
    }

    // UNIQUE constraints
    const uniques = uniquesByEntity.get(entity.name) ?? [];
    for (const u of uniques) {
      const cols = u.map((f) => {
        const rel = relsByEntityField.get(`${entity.name}.${f}`);
        return rel ? `${snakeCase(f)}_id` : snakeCase(f);
      });
      colDefs.push(`    UNIQUE(${cols.join(", ")})`);
    }

    lines.push(`CREATE TABLE IF NOT EXISTS ${tableName} (`);
    lines.push(colDefs.join(",\n"));
    lines.push(`);\n`);
  }

  // Emit standalone indexes
  for (const idx of db.indexes) {
    const tableName = snakeCase(idx.entity);
    const cols = idx.fields.map((f) => {
      const rel = relsByEntityField.get(`${idx.entity}.${f}`);
      return rel ? `${snakeCase(f)}_id` : snakeCase(f);
    });
    const idxName = `idx_${tableName}_${cols.join("_")}`;
    lines.push(`CREATE INDEX IF NOT EXISTS ${idxName} ON ${tableName}(${cols.join(", ")});`);
  }

  return lines.join("\n") + "\n";
}
