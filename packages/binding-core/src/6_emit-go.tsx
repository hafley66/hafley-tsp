// Go emitter -- consumes FactDB, produces generated.go via alloy-go JSX.
// Targets database/sql + sqlx for DB access.

import { Output, render, List, type OutputDirectory } from "@alloy-js/core";
import {
  ModuleDirectory,
  SourceDirectory,
  SourceFile,
  StructTypeDeclaration,
  StructMember,
  FunctionDeclaration,
} from "@alloy-js/go";

import type { FactDB, FieldFact, RelationFact } from "./2_facts.js";

// ── Type mapping ──────────────────────────────────────────

const GO_TYPE: Record<string, string> = {
  string: "string",
  integer: "int64",
  int8: "int8", int16: "int16", int32: "int32", int64: "int64",
  uint8: "uint8", uint16: "uint16", uint32: "uint32", uint64: "uint64",
  float: "float64", float32: "float32", float64: "float64",
  boolean: "bool",
  bytes: "[]byte",
};

function goType(tspType: string, nullable: boolean): string {
  const base = GO_TYPE[tspType] ?? "string";
  if (!nullable) return base;
  // Pointer type for nullable
  if (base === "string") return "*string";
  if (base === "bool") return "*bool";
  if (base === "[]byte") return "[]byte"; // slices are already nullable
  return `*${base}`;
}

function pascalCase(s: string): string {
  return s
    .replace(/\./g, "_")
    .split(/[-_]/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

function snakeCase(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/\./g, "_").toLowerCase();
}

function sqlColName(field: FieldFact, rels: Map<string, RelationFact>): string {
  const rel = rels.get(`${field.entity}.${field.name}`);
  return rel ? `${snakeCase(field.name)}_id` : snakeCase(field.name);
}

// ── Lookup builders (shared with Rust emitter) ───────────

function buildLookups(db: FactDB) {
  const pksByEntity = new Map<string, string[]>();
  for (const pk of db.pks) {
    if (!pksByEntity.has(pk.entity)) pksByEntity.set(pk.entity, []);
    pksByEntity.get(pk.entity)!.push(pk.field);
  }
  const relsByKey = new Map<string, RelationFact>();
  for (const rel of db.relations) relsByKey.set(`${rel.entity}.${rel.field}`, rel);
  const defaultsByKey = new Map<string, string>();
  for (const d of db.defaults) defaultsByKey.set(`${d.entity}.${d.field}`, d.value);
  const uniquesByEntity = new Map<string, string[][]>();
  for (const u of db.uniques) {
    if (!uniquesByEntity.has(u.entity)) uniquesByEntity.set(u.entity, []);
    uniquesByEntity.get(u.entity)!.push(u.fields);
  }
  const manualFields = new Set<string>();
  for (const m of db.manuals) manualFields.add(`${m.entity}.${m.field}`);
  const syncStrategyByEntity = new Map<string, string>();
  for (const s of db.sync_strategies) syncStrategyByEntity.set(s.entity, s.strategy);
  const bindingByTarget = new Map<string, string>();
  const bindingByName = new Map<string, { source: string; target: string }>();
  for (const b of db.bindings) {
    bindingByTarget.set(b.target, b.name);
    bindingByName.set(b.name, { source: b.source, target: b.target });
  }

  return {
    pksByEntity, relsByKey, defaultsByKey, uniquesByEntity, manualFields,
    syncStrategyByEntity, bindingByTarget, bindingByName,
  };
}

type Lookups = ReturnType<typeof buildLookups>;

// ── Row struct field helpers ─────────────────────────────

function rowFieldGoName(f: FieldFact, rels: Map<string, RelationFact>): string {
  const col = snakeCase(f.name).replace(/\./g, "_");
  const rel = rels.get(`${f.entity}.${f.name}`);
  return pascalCase(rel ? `${col}_id` : col);
}

function rowFieldGoType(f: FieldFact, rels: Map<string, RelationFact>): string {
  const rel = rels.get(`${f.entity}.${f.name}`);
  return rel ? (f.nullable ? "*int64" : "int64") : goType(f.type, f.nullable);
}

function rowFieldDbTag(f: FieldFact, rels: Map<string, RelationFact>): string {
  const rel = rels.get(`${f.entity}.${f.name}`);
  return rel ? `${snakeCase(f.name)}_id` : snakeCase(f.name).replace(/\./g, "_");
}

// ── Upsert function emitter (string) ────────────────────

function emitUpsertFn(entityName: string, fields: FieldFact[], lookups: Lookups): string {
  const { pksByEntity, relsByKey, uniquesByEntity, manualFields, syncStrategyByEntity } = lookups;
  const tableName = snakeCase(entityName);
  const pks = pksByEntity.get(entityName) ?? [];
  const strategy = syncStrategyByEntity.get(entityName) ?? "upsert";
  const isAutoIncrPk = pks.length === 1 && fields.find(f => f.name === pks[0])?.type === "integer";

  const upsertFields = fields.filter(f => {
    if (isAutoIncrPk && pks.includes(f.name)) return false;
    if (manualFields.has(`${entityName}.${f.name}`)) return false;
    return true;
  });

  const colNames = upsertFields.map(f => sqlColName(f, relsByKey));
  const placeholders = upsertFields.map((_, i) => `$${i + 1}`).join(", ");
  const fnName = strategy === "insert-ignore" ? `Insert${pascalCase(tableName)}` : `Upsert${pascalCase(tableName)}`;
  const returnsId = isAutoIncrPk && strategy === "upsert";

  // Build params struct fields
  const params = upsertFields.map(f => {
    const rel = relsByKey.get(`${entityName}.${f.name}`);
    const paramName = snakeCase(rel ? `${f.name}_id` : f.name).replace(/\./g, "_");
    const ty = rel ? (f.nullable ? "*int64" : "int64") : goType(f.type, f.nullable);
    return { paramName, ty };
  });

  const lines: string[] = [];
  lines.push(`func ${fnName}(ctx context.Context, db *sqlx.DB, ${params.map(p => `${p.paramName} ${p.ty}`).join(", ")}) (${returnsId ? "int64, " : ""}error) {`);

  if (strategy === "insert-ignore" || strategy === "delete-replace") {
    lines.push(`\tquery := \`INSERT OR IGNORE INTO ${tableName}`);
    lines.push(`\t\t(${colNames.join(", ")})`);
    lines.push(`\t\tVALUES (${placeholders})\``);
  } else {
    const uniques = uniquesByEntity.get(entityName) ?? [];
    let conflictCols: string[];
    if (uniques.length > 0) {
      conflictCols = uniques[0].map(f => {
        const rel = relsByKey.get(`${entityName}.${f}`);
        return rel ? `${snakeCase(f)}_id` : snakeCase(f);
      });
    } else {
      conflictCols = pks.map(p => {
        const rel = relsByKey.get(`${entityName}.${p}`);
        return rel ? `${snakeCase(p)}_id` : snakeCase(p);
      });
    }
    const updateCols = colNames.filter(c => !conflictCols.includes(c) && !pks.map(p => snakeCase(p)).includes(c));

    lines.push(`\tquery := \`INSERT INTO ${tableName}`);
    lines.push(`\t\t(${colNames.join(", ")})`);
    lines.push(`\t\tVALUES (${placeholders})`);
    if (conflictCols.length > 0 && updateCols.length > 0) {
      lines.push(`\t\tON CONFLICT(${conflictCols.join(", ")}) DO UPDATE SET`);
      lines.push(`\t\t\t${updateCols.map(c => `${c} = excluded.${c}`).join(",\n\t\t\t")}`);
    } else if (conflictCols.length > 0) {
      lines.push(`\t\tON CONFLICT(${conflictCols.join(", ")}) DO NOTHING`);
    }
    if (returnsId) lines.push(`\t\tRETURNING id\``);
    else lines.push(`\t\``);
  }

  const bindArgs = params.map(p => p.paramName).join(", ");

  if (returnsId) {
    lines.push(`\tvar id int64`);
    lines.push(`\terr := db.QueryRowContext(ctx, query, ${bindArgs}).Scan(&id)`);
    lines.push(`\treturn id, err`);
  } else {
    lines.push(`\t_, err := db.ExecContext(ctx, query, ${bindArgs})`);
    lines.push(`\treturn err`);
  }
  lines.push(`}`);
  return lines.join("\n");
}

// ── JSON extraction emitter (string) ────────────────────

function emitJsonAccess(expr: string, field: FieldFact): string {
  const base = GO_TYPE[field.type] ?? "string";
  if (field.nullable) {
    if (base === "string") return `jsonOptString(${expr})`;
    if (base === "int64") return `jsonOptInt64(${expr})`;
    if (base === "bool") return `jsonOptBool(${expr})`;
    return `jsonOptString(${expr})`;
  }
  if (base === "string") return `jsonString(${expr})`;
  if (base === "int64") return `jsonInt64(${expr})`;
  if (base === "bool") return `jsonBool(${expr})`;
  return `jsonString(${expr})`;
}

function emitExtractFn(bindingName: string, db: FactDB, lookups: Lookups): string {
  const { bindingByName, relsByKey } = lookups;
  const info = bindingByName.get(bindingName);
  if (!info) return "";

  const entityFields = db.fields.filter(f => f.entity === info.target);
  const fieldMaps = db.field_maps.filter(fm => fm.binding === bindingName);
  const autoMaps = db.auto_maps.filter(am => am.binding === bindingName);
  const manuals = new Set(db.manuals.filter(m => m.entity === info.target).map(m => m.field));
  const pks = lookups.pksByEntity.get(info.target) ?? [];
  const isAutoIncrPk = pks.length === 1 && entityFields.find(f => f.name === pks[0])?.type === "integer";

  const structName = `${info.target}Fields`;
  const fnName = `Extract${pascalCase(info.target)}`;
  const fieldMapByTarget = new Map<string, string[]>();
  for (const fm of fieldMaps) fieldMapByTarget.set(fm.target_field, fm.source_chain);
  const autoMapSet = new Set(autoMaps.map(am => am.field));

  const lines: string[] = [];
  lines.push(`// Extract${pascalCase(info.target)} extracts ${info.target} fields from a ${info.source} JSON value.`);
  lines.push(`func ${fnName}(src map[string]interface{}) ${structName} {`);
  lines.push(`\treturn ${structName}{`);

  for (const field of entityFields) {
    if (relsByKey.get(`${info.target}.${field.name}`)) continue;
    if (manuals.has(field.name)) continue;
    if (isAutoIncrPk && pks.includes(field.name)) continue;

    const goField = pascalCase(snakeCase(field.name).replace(/\./g, "_"));
    const chain = fieldMapByTarget.get(field.name);

    if (chain) {
      const jsonPath = chain.map(link => { const dot = link.indexOf("."); return dot >= 0 ? link.substring(dot + 1) : link; });
      if (jsonPath.length === 1) {
        lines.push(`\t\t${goField}: ${emitJsonAccess(`src["${jsonPath[0]}"]`, field)},`);
      } else {
        // nested: dig(src, "a", "b")
        const pathArgs = jsonPath.map(p => `"${p}"`).join(", ");
        lines.push(`\t\t${goField}: ${emitJsonAccess(`dig(src, ${pathArgs})`, field)},`);
      }
    } else if (field.is_dot_path) {
      const parts = field.name.split(".");
      const pathArgs = parts.map(p => `"${p}"`).join(", ");
      lines.push(`\t\t${goField}: ${emitJsonAccess(`dig(src, ${pathArgs})`, field)},`);
    } else if (autoMapSet.has(field.name)) {
      lines.push(`\t\t${goField}: ${emitJsonAccess(`src["${field.name}"]`, field)},`);
    }
  }

  lines.push(`\t}`);
  lines.push(`}`);
  return lines.join("\n");
}

// ── Main entry point ─────────────────────────────────────

const GO_IMPORTS = [
  `"context"`,
  `"database/sql"`,
  `"encoding/json"`,
];

export function emitGo(db: FactDB): string {
  const lookups = buildLookups(db);

  // Build upsert + extract sections as strings (complex logic, not worth JSX)
  const upsertSections = db.entities
    .map(e => emitUpsertFn(e.name, db.fields.filter(f => f.entity === e.name), lookups))
    .filter(Boolean);

  const extractSections = db.bindings
    .map(b => emitExtractFn(b.name, db, lookups))
    .filter(Boolean);

  const hasExtracts = extractSections.length > 0;

  const tree = (
    <Output>
      <ModuleDirectory name="github.com/example/app">
      <SourceDirectory path="db">
      <SourceFile path="generated.go">

        {/* ── Imports ── */}
        {"import (\n"}
        {GO_IMPORTS.map(i => `\t${i}\n`).join("")}
        {hasExtracts && `\n\t"github.com/jmoiron/sqlx"\n`}
        {")\n\n"}

        {/* ── Row structs ── */}
        {db.entities.map((e) => {
          const fields = db.fields.filter(f => f.entity === e.name);
          return <>
            <StructTypeDeclaration name={e.name}>
              <List hardline>
                {fields.map(f => (
                  <StructMember
                    name={rowFieldGoName(f, lookups.relsByKey)}
                    type={rowFieldGoType(f, lookups.relsByKey)}
                    tag={{ db: rowFieldDbTag(f, lookups.relsByKey), json: snakeCase(f.name).replace(/\./g, "_") }}
                  />
                ))}
              </List>
            </StructTypeDeclaration>
            {"\n\n"}
          </>;
        })}

        {/* ── Extraction structs ── */}
        {db.bindings.map((binding) => {
          const fields = db.fields.filter(f => f.entity === binding.target);
          const pks = lookups.pksByEntity.get(binding.target) ?? [];
          const isAutoIncrPk = pks.length === 1 && fields.find(f => f.name === pks[0])?.type === "integer";
          const extractable = fields.filter(f => {
            if (lookups.relsByKey.get(`${binding.target}.${f.name}`)) return false;
            if (lookups.manualFields.has(`${binding.target}.${f.name}`)) return false;
            if (isAutoIncrPk && pks.includes(f.name)) return false;
            return true;
          });
          if (extractable.length === 0) return null;
          return <>
            <StructTypeDeclaration name={`${binding.target}Fields`}>
              <List hardline>
                {extractable.map(f => {
                  const col = snakeCase(f.name).replace(/\./g, "_");
                  return <StructMember name={pascalCase(col)} type={goType(f.type, f.nullable)} tag={{ db: col, json: col }} />;
                })}
              </List>
            </StructTypeDeclaration>
            {"\n\n"}
          </>;
        })}

        {/* ── JSON helpers ── */}
        {hasExtracts && <>
          {"// ── JSON access helpers ──\n\n"}
          {"func jsonString(v interface{}) string {\n\tif s, ok := v.(string); ok { return s }\n\treturn \"\"\n}\n\n"}
          {"func jsonOptString(v interface{}) *string {\n\tif v == nil { return nil }\n\ts := jsonString(v)\n\treturn &s\n}\n\n"}
          {"func jsonInt64(v interface{}) int64 {\n\tif n, ok := v.(float64); ok { return int64(n) }\n\treturn 0\n}\n\n"}
          {"func jsonOptInt64(v interface{}) *int64 {\n\tif v == nil { return nil }\n\tn := jsonInt64(v)\n\treturn &n\n}\n\n"}
          {"func jsonBool(v interface{}) bool {\n\tif b, ok := v.(bool); ok { return b }\n\treturn false\n}\n\n"}
          {"func jsonOptBool(v interface{}) *bool {\n\tif v == nil { return nil }\n\tb := jsonBool(v)\n\treturn &b\n}\n\n"}
          {"func dig(m map[string]interface{}, keys ...string) interface{} {\n\tvar cur interface{} = m\n\tfor _, k := range keys {\n\t\tif mm, ok := cur.(map[string]interface{}); ok {\n\t\t\tcur = mm[k]\n\t\t} else {\n\t\t\treturn nil\n\t\t}\n\t}\n\treturn cur\n}\n\n"}
        </>}

        {/* ── Upsert functions ── */}
        {upsertSections.join("\n\n")}
        {upsertSections.length > 0 && "\n\n"}

        {/* ── Extraction functions ── */}
        {extractSections.join("\n\n")}
        {extractSections.length > 0 && "\n"}

      </SourceFile>
      </SourceDirectory>
      </ModuleDirectory>
    </Output>
  );

  const output = render(tree);
  return findFileContent(output, "generated.go") || findFileContentDeep(output);
}

function findFileContentDeep(dir: OutputDirectory): string {
  for (const item of dir.contents) {
    if (item.kind === "file" && item.path.endsWith(".go")) return (item as any).contents ?? "";
    if (item.kind === "directory") {
      const found = findFileContentDeep(item);
      if (found) return found;
    }
  }
  return "";
}

function findFileContent(dir: OutputDirectory, name: string): string {
  for (const item of dir.contents) {
    if (item.kind === "file" && item.path === name) return (item as any).contents ?? "";
    if (item.kind === "directory") {
      const found = findFileContent(item, name);
      if (found) return found;
    }
  }
  return "";
}
