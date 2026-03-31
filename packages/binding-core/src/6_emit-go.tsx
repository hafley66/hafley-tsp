// Go emitter -- walks the TSP program graph directly via decorator accessors.
// Targets database/sql + sqlx.

import { Output, render, List, type OutputDirectory } from "@alloy-js/core";
import {
  ModuleDirectory, SourceDirectory, SourceFile,
  StructTypeDeclaration, StructMember,
} from "@alloy-js/go";

import type { Program } from "@typespec/compiler";
import {
  resolvedFields, resolveFieldType, collectModels, isEntityModel, snakeCase,
  extractChain, type ResolvedField,
} from "./2_facts.js";
import {
  isPk, isManual, getUnique, getDefault, hasDefault,
  getBinding, hasBinding, getAllRelations,
  getSyncStrategy, hasSyncStrategy,
  type RelationDef,
} from "./decorators.js";

// ── Type mapping ──────────────────────────────────────────

const GO_TYPE: Record<string, string> = {
  string: "string", integer: "int64",
  int8: "int8", int16: "int16", int32: "int32", int64: "int64",
  uint8: "uint8", uint16: "uint16", uint32: "uint32", uint64: "uint64",
  float: "float64", float32: "float32", float64: "float64",
  boolean: "bool", bytes: "[]byte",
};

function goType(t: string, nullable: boolean): string {
  const base = GO_TYPE[t] ?? "string";
  if (!nullable) return base;
  if (base === "[]byte") return "[]byte";
  return `*${base}`;
}

function pascalCase(s: string): string {
  return s.replace(/\./g, "_").split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join("");
}

// ── Per-field helpers ─────────────────────────────────────

function goName(f: ResolvedField): string {
  const col = snakeCase(f.name).replace(/\./g, "_");
  return pascalCase(f.rel ? `${col}_id` : col);
}

function goFieldType(f: ResolvedField): string {
  return f.rel ? (f.nullable ? "*int64" : "int64") : goType(f.typeName, f.nullable);
}

function dbTag(f: ResolvedField): string {
  return f.rel ? `${snakeCase(f.name)}_id` : snakeCase(f.name).replace(/\./g, "_");
}

function jsonTag(f: ResolvedField): string {
  const base = snakeCase(f.name).replace(/\./g, "_");
  return f.rel ? `${base}_id` : base;
}

function sqlCol(f: ResolvedField): string {
  return f.rel ? `${snakeCase(f.name)}_id` : snakeCase(f.name);
}

// ── Upsert function emitter ─────────────────────────────

function emitUpsertFn(program: Program, fields: ResolvedField[], modelName: string): string {
  const pks = fields.filter(f => f.isPk).map(f => f.name);
  const isAutoIncr = pks.length === 1 && fields.find(f => f.name === pks[0])?.typeName === "integer";
  const strategy = hasSyncStrategy(program, fields[0].prop.model!) ? getSyncStrategy(program, fields[0].prop.model!) : "upsert";
  const tableName = snakeCase(modelName);

  const upsertFields = fields.filter(f => !(isAutoIncr && f.isPk) && !f.isManual);
  const colNames = upsertFields.map(sqlCol);
  const placeholders = upsertFields.map((_, i) => `$${i + 1}`).join(", ");
  const fnName = strategy === "insert-ignore" ? `Insert${pascalCase(tableName)}` : `Upsert${pascalCase(tableName)}`;
  const returnsId = isAutoIncr && strategy === "upsert";

  const params = upsertFields.map(f => ({
    name: snakeCase(f.rel ? `${f.name}_id` : f.name).replace(/\./g, "_"),
    ty: f.rel ? (f.nullable ? "*int64" : "int64") : goType(f.typeName, f.nullable),
  }));

  const lines: string[] = [];
  lines.push(`func ${fnName}(ctx context.Context, db *sqlx.DB, ${params.map(p => `${p.name} ${p.ty}`).join(", ")}) (${returnsId ? "int64, " : ""}error) {`);

  if (strategy === "insert-ignore" || strategy === "delete-replace") {
    lines.push(`\tquery := \`INSERT OR IGNORE INTO ${tableName}`, `\t\t(${colNames.join(", ")})`, `\t\tVALUES (${placeholders})\``);
  } else {
    const uniques: string[][] = [];
    for (const f of fields) {
      for (const u of (getUnique(program, f.prop) ?? [])) uniques.push(u.fields);
    }

    const conflictCols = (uniques.length > 0 ? uniques[0] : pks).map(n => {
      const f = fields.find(fv => fv.name === n);
      return f?.rel ? `${snakeCase(n)}_id` : snakeCase(n);
    });
    const updateCols = colNames.filter(c => !conflictCols.includes(c) && !pks.map(p => snakeCase(p)).includes(c));

    lines.push(`\tquery := \`INSERT INTO ${tableName}`, `\t\t(${colNames.join(", ")})`, `\t\tVALUES (${placeholders})`);
    if (conflictCols.length > 0 && updateCols.length > 0) {
      lines.push(`\t\tON CONFLICT(${conflictCols.join(", ")}) DO UPDATE SET`);
      lines.push(`\t\t\t${updateCols.map(c => `${c} = excluded.${c}`).join(",\n\t\t\t")}`);
    } else if (conflictCols.length > 0) {
      lines.push(`\t\tON CONFLICT(${conflictCols.join(", ")}) DO NOTHING`);
    }
    lines.push(returnsId ? `\t\tRETURNING id\`` : `\t\``);
  }

  const bindArgs = params.map(p => p.name).join(", ");
  if (returnsId) {
    lines.push(`\tvar id int64`, `\terr := db.QueryRowContext(ctx, query, ${bindArgs}).Scan(&id)`, `\treturn id, err`);
  } else {
    lines.push(`\t_, err := db.ExecContext(ctx, query, ${bindArgs})`, `\treturn err`);
  }
  lines.push(`}`);
  return lines.join("\n");
}

// ── JSON extraction emitter ─────────────────────────────

function jsonAccess(expr: string, typeName: string, nullable: boolean): string {
  const base = GO_TYPE[typeName] ?? "string";
  const fn = nullable
    ? { string: "jsonOptString", int64: "jsonOptInt64", bool: "jsonOptBool" }[base] ?? "jsonOptString"
    : { string: "jsonString", int64: "jsonInt64", bool: "jsonBool" }[base] ?? "jsonString";
  return `${fn}(${expr})`;
}

function emitExtractFn(program: Program, bindingModel: any, relMap: Map<string, RelationDef[]>): string {
  const binding = getBinding(program, bindingModel)!;
  const target = binding.targetModel;
  const source = binding.sourceModel;
  const fields = resolvedFields(program, target, relMap);
  const pks = fields.filter(f => f.isPk).map(f => f.name);
  const isAutoIncr = pks.length === 1 && fields.find(f => f.name === pks[0])?.typeName === "integer";

  // Explicit field maps from binding model properties
  const fieldMapByTarget = new Map<string, string[]>();
  const explicit = new Set<string>();
  for (const [, prop] of bindingModel.properties) {
    explicit.add(prop.name);
    const chain = extractChain(prop.type);
    if (chain.length > 0) fieldMapByTarget.set(prop.name, chain);
  }

  // Auto maps
  const sourceNames = new Set([...source.properties.keys()]);
  const autoSet = new Set<string>();
  for (const [, prop] of target.properties) {
    if (explicit.has(prop.name) || prop.name.includes(".") || prop.name.startsWith("_")) continue;
    if (sourceNames.has(prop.name)) autoSet.add(prop.name);
  }

  const fnName = `Extract${pascalCase(target.name)}`;
  const lines: string[] = [];
  lines.push(`// ${fnName} extracts ${target.name} fields from a ${source.name} JSON value.`);
  lines.push(`func ${fnName}(src map[string]interface{}) ${target.name}Fields {`);
  lines.push(`\treturn ${target.name}Fields{`);

  for (const f of fields) {
    if (f.rel || f.isManual || (isAutoIncr && f.isPk)) continue;
    const goField = pascalCase(snakeCase(f.name).replace(/\./g, "_"));
    const chain = fieldMapByTarget.get(f.name);

    if (chain) {
      const jsonPath = chain.map(link => { const dot = link.indexOf("."); return dot >= 0 ? link.substring(dot + 1) : link; });
      const expr = jsonPath.length === 1 ? `src["${jsonPath[0]}"]` : `dig(src, ${jsonPath.map(p => `"${p}"`).join(", ")})`;
      lines.push(`\t\t${goField}: ${jsonAccess(expr, f.typeName, f.nullable)},`);
    } else if (f.isDotPath) {
      lines.push(`\t\t${goField}: ${jsonAccess(`dig(src, ${f.name.split(".").map(p => `"${p}"`).join(", ")})`, f.typeName, f.nullable)},`);
    } else if (autoSet.has(f.name)) {
      lines.push(`\t\t${goField}: ${jsonAccess(`src["${f.name}"]`, f.typeName, f.nullable)},`);
    }
  }

  lines.push(`\t}`, `}`);
  return lines.join("\n");
}

// ── Main entry point ─────────────────────────────────────

export function emitGo(program: Program): string {
  const allModels = collectModels(program.getGlobalNamespaceType());
  const relMap = getAllRelations(program);
  const entities = allModels.filter(m => isEntityModel(program, m));
  const bindings = allModels.filter(m => hasBinding(program, m));
  const hasExtracts = bindings.length > 0;

  // Pre-resolve fields per entity
  const fieldsByEntity = new Map(entities.map(m => [m.name, resolvedFields(program, m, relMap)]));

  const upsertSections = entities.map(m => emitUpsertFn(program, fieldsByEntity.get(m.name)!, m.name)).filter(Boolean);
  const extractSections = bindings.map(m => emitExtractFn(program, m, relMap)).filter(Boolean);

  const tree = (
    <Output>
      <ModuleDirectory name="github.com/example/app">
      <SourceDirectory path="db">
      <SourceFile path="generated.go">

        {"import (\n"}
        {`\t"context"\n\t"database/sql"\n\t"encoding/json"\n`}
        {hasExtracts && `\n\t"github.com/jmoiron/sqlx"\n`}
        {")\n\n"}

        {/* Row structs */}
        {entities.map(model => {
          const fields = fieldsByEntity.get(model.name)!;
          return <>
            <StructTypeDeclaration name={model.name}>
              <List hardline>
                {fields.map(f => (
                  <StructMember name={goName(f)} type={goFieldType(f)} tag={{ db: dbTag(f), json: jsonTag(f) }} />
                ))}
              </List>
            </StructTypeDeclaration>
            {"\n\n"}
          </>;
        })}

        {/* Extraction structs */}
        {bindings.map(bindingModel => {
          const binding = getBinding(program, bindingModel)!;
          const fields = fieldsByEntity.get(binding.targetModel.name);
          if (!fields) return null;
          const pks = fields.filter(f => f.isPk).map(f => f.name);
          const isAutoIncr = pks.length === 1 && fields.find(f => f.name === pks[0])?.typeName === "integer";
          const extractable = fields.filter(f => !f.rel && !f.isManual && !(isAutoIncr && f.isPk));
          if (extractable.length === 0) return null;
          return <>
            <StructTypeDeclaration name={`${binding.targetModel.name}Fields`}>
              <List hardline>
                {extractable.map(f => {
                  const col = snakeCase(f.name).replace(/\./g, "_");
                  return <StructMember name={pascalCase(col)} type={goType(f.typeName, f.nullable)} tag={{ db: col, json: col }} />;
                })}
              </List>
            </StructTypeDeclaration>
            {"\n\n"}
          </>;
        })}

        {/* JSON helpers */}
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

        {upsertSections.join("\n\n")}
        {upsertSections.length > 0 && "\n\n"}
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
    if (item.kind === "directory") { const found = findFileContentDeep(item); if (found) return found; }
  }
  return "";
}

function findFileContent(dir: OutputDirectory, name: string): string {
  for (const item of dir.contents) {
    if (item.kind === "file" && item.path === name) return (item as any).contents ?? "";
    if (item.kind === "directory") { const found = findFileContent(item, name); if (found) return found; }
  }
  return "";
}
