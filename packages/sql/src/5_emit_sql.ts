import type { Program } from "@typespec/compiler";
import { getAllRelations, getIndex, getUnique } from "./1_decorators.js";
import { collectModels, isEntityModel, resolvedFields, resolveRelTarget, snakeCase, type ResolvedField } from "./2_facts.js";
import { internStorage, type InternStorage } from "./3_intern.js";
import { sqliteDialect, type SqlDialect } from "./4_dialect.js";

function columnName(field: ResolvedField): string {
  return field.rel ? `${snakeCase(field.name)}_id` : snakeCase(field.name);
}

export function emitSQL(program: Program, dialect: SqlDialect = sqliteDialect): string {
  return emitSQLFromStorage(program, internStorage(program), dialect);
}

export function emitSQLFromStorage(program: Program, interned: InternStorage, dialect: SqlDialect = sqliteDialect): string {
  const allModels = collectModels(program.getGlobalNamespaceType());
  const relations = getAllRelations(program);
  const entities = allModels.filter((model) => isEntityModel(program, model) && !interned.entities.some((entity) => entity.model === model));
  const keysByEntity = new Map<string, string[]>();
  for (const model of entities) {
    keysByEntity.set(model.name, resolvedFields(program, model, relations).filter((field) => field.isPk).map((field) => field.name));
  }

  const lines: string[] = [];
  for (const model of entities) {
    const fields = resolvedFields(program, model, relations);
    const keys = keysByEntity.get(model.name)!;
    const composite = keys.length > 1;
    const table = snakeCase(model.name);
    const columns: string[] = [];
    for (const field of fields) {
      const column = columnName(field);
      if (field.rel?.kind === "belongsTo") {
        const target = resolveRelTarget(field.rel);
        const parts = [column, dialect.scalarType("integer")];
        if (!field.nullable) parts.push("NOT NULL");
        if (field.isPk && !composite) parts.push("PRIMARY KEY");
        parts.push(`REFERENCES ${snakeCase(target)}(${(keysByEntity.get(target) ?? ["id"])[0]})`);
        if (field.default) parts.push(`DEFAULT ${field.default}`);
        columns.push("    " + parts.join(" "));
        continue;
      }
      const parts = [column, dialect.scalarType(field.typeName)];
      if (field.isPk && !composite) {
        parts.splice(1, 1, dialect.identityColumn(field.typeName, true));
      } else {
        if (!field.nullable) parts.push("NOT NULL");
        if (field.default) parts.push(`DEFAULT ${field.default}`);
      }
      columns.push("    " + parts.join(" "));
    }
    if (composite) {
      const keyColumns = keys.map((name) => {
        const field = fields.find((candidate) => candidate.name === name);
        return field?.rel ? `${snakeCase(name)}_id` : snakeCase(name);
      });
      columns.push(`    PRIMARY KEY (${keyColumns.join(", ")})`);
    }
    for (const [, property] of model.properties) {
      for (const unique of getUnique(program, property) ?? []) {
        const names = unique.fields.map((name) => {
          const field = fields.find((candidate) => candidate.name === name);
          return field?.rel ? `${snakeCase(name)}_id` : snakeCase(name);
        });
        columns.push(`    UNIQUE(${names.join(", ")})`);
      }
    }
    lines.push(`CREATE TABLE IF NOT EXISTS ${table} (`, columns.join(",\n"), `);\n`);
  }

  for (const model of entities) {
    const fields = resolvedFields(program, model, relations);
    const table = snakeCase(model.name);
    for (const [, property] of model.properties) {
      for (const index of getIndex(program, property) ?? []) {
        const names = index.fields.map((name) => {
          const field = fields.find((candidate) => candidate.name === name);
          return field?.rel ? `${snakeCase(name)}_id` : snakeCase(name);
        });
        lines.push(`CREATE INDEX IF NOT EXISTS idx_${table}_${names.join("_")} ON ${table}(${names.join(", ")});`);
      }
    }
  }
  return lines.join("\n") + "\n" + emitInternSQL(interned, dialect);
}

function emitInternSQL(storage: InternStorage, dialect: SqlDialect): string {
  const quote = dialect.quoteIdentifier.bind(dialect);
  const lines: string[] = [];
  for (const domain of storage.domains) {
    lines.push(`CREATE TABLE IF NOT EXISTS ${quote(domain.table)} (`,
      `    id ${dialect.identityColumn("integer", false)},`, `    value ${dialect.exactTextType} NOT NULL UNIQUE`, `);\n`);
  }
  for (const entity of storage.entities) {
    const columns = entity.fields.map((field) => {
      if (field.domain) return `    ${quote(field.column)} ${dialect.scalarType("integer")}${field.nullable ? "" : " NOT NULL"} REFERENCES ${quote(field.domain.table)}(id)`;
      if (field.reference) return `    ${quote(field.column)} ${dialect.scalarType("integer")}${field.nullable ? "" : " NOT NULL"} REFERENCES ${quote(field.reference.table)}(${quote(field.reference.column)})`;
      return `    ${quote(field.column)} ${field.isPk ? dialect.identityColumn(field.typeName, false) : `${dialect.scalarType(field.typeName)}${field.nullable ? "" : " NOT NULL"}`}${field.default === undefined ? "" : ` DEFAULT ${field.default}`}`;
    });
    for (const key of entity.unique) columns.push(`    UNIQUE (${key.map(quote).join(", ")})`);
    lines.push(`CREATE TABLE IF NOT EXISTS ${quote(entity.table)} (`, columns.join(",\n"), `);\n`);
    for (const [index, fields] of entity.indexes.entries()) {
      lines.push(`CREATE INDEX IF NOT EXISTS ${quote(`${entity.table}_index_${index}`)} ON ${quote(entity.table)} (${fields.map(quote).join(", ")});`);
    }
    const joins: string[] = [];
    const readable = entity.fields.map((field, index) => {
      if (!field.domain) return `e.${quote(field.column)} AS ${quote(field.name)}`;
      joins.push(`LEFT JOIN ${quote(field.domain.table)} AS d${index} ON d${index}.id = e.${quote(field.column)}`);
      return `d${index}.value AS ${quote(field.name)}`;
    });
    lines.push(`CREATE VIEW IF NOT EXISTS ${quote(entity.view)} AS`,
      `SELECT ${readable.join(", ")} FROM ${quote(entity.table)} AS e`, ...joins, `;\n`);
  }
  return lines.join("\n");
}
