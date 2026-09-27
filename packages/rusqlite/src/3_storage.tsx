import { List } from "@alloy-js/core";
import { StructDeclaration, StructField } from "@hafley66/alloy-rs";
import type { Model, Program, Type } from "@typespec/compiler";
import {
  collectModels, getAllRelations, getUnique, internAutoFile, internStorage, isEntityModel,
  resolvedFields, snakeCase, sqliteDialect, type InternStorage, type ResolvedField, type SqlDialect,
} from "@hafley/typespec-sql";
import { emitInternRusqlite } from "./2_intern_writer.js";
import { validateRusqliteStorage, type RusqliteStrategy } from "./1_validate.js";

export const RUSQLITE_RUST_TYPE: Record<string, string> = {
  string: "String", integer: "i64", int8: "i8", int16: "i16", int32: "i32", int64: "i64",
  uint8: "u8", uint16: "u16", uint32: "u32", float: "f64", float32: "f32", float64: "f64",
  boolean: "bool", bytes: "Vec<u8>",
};
const RESERVED = new Set([
  "as", "async", "await", "break", "const", "continue", "crate", "dyn", "else", "enum", "extern", "false",
  "fn", "for", "if", "impl", "in", "let", "loop", "match", "mod", "move", "mut", "pub", "ref", "return",
  "self", "Self", "static", "struct", "super", "trait", "true", "type", "unsafe", "use", "where", "while",
  "abstract", "become", "box", "do", "final", "macro", "override", "priv", "try", "typeof", "unsized", "virtual", "yield",
]);

export function rusqliteRustType(type: string, nullable: boolean): string {
  const base = RUSQLITE_RUST_TYPE[type] ?? "String";
  return nullable ? `Option<${base}>` : base;
}
export function rusqliteRustIdent(name: string): string { return RESERVED.has(name) ? `r#${name}` : name; }
export function rusqliteRowName(field: ResolvedField): string {
  const column = snakeCase(field.name).replace(/\./g, "_");
  return rusqliteRustIdent(field.rel ? `${column}_id` : column);
}
export function rusqliteRowType(field: ResolvedField): string {
  return field.rel ? field.nullable ? "Option<i64>" : "i64" : rusqliteRustType(field.typeName, field.nullable);
}
function sqlColumn(field: ResolvedField): string { return field.rel ? `${snakeCase(field.name)}_id` : snakeCase(field.name); }

export interface RusqliteStorageOptions {
  dialect?: SqlDialect;
  existingFile?: string;
  interned?: InternStorage;
  strategyForModel?: (model: Model) => RusqliteStrategy;
}
export interface RusqliteStorageParts {
  program: Program;
  dialect: SqlDialect;
  interned: InternStorage;
  entities: Model[];
  fieldsByEntity: Map<string, ResolvedField[]>;
  strategies: Map<Model, RusqliteStrategy>;
  writerSections: string[];
  internFile?: string;
  sourceTypes: Type[];
}

export function rusqliteStorage(program: Program, options: RusqliteStorageOptions = {}): RusqliteStorageParts {
  const dialect = options.dialect ?? sqliteDialect;
  const storage = options.interned ?? internStorage(program);
  const strategyForModel = options.strategyForModel ?? (() => "upsert");
  const models = collectModels(program.getGlobalNamespaceType());
  const relations = getAllRelations(program);
  const entities = models.filter((model) => isEntityModel(program, model) && !storage.entities.some((entity) => entity.model === model));
  const fieldsByEntity = new Map(entities.map((model) => [model.name, resolvedFields(program, model, relations)]));
  validateRusqliteStorage(storage, dialect, entities.map((model) => ({ model, fields: fieldsByEntity.get(model.name)! })), strategyForModel);
  const strategies = new Map(entities.map((model) => [model, strategyForModel(model)]));
  const writerSections = entities.map((model) => emitRusqliteWriter(program, fieldsByEntity.get(model.name)!, model.name, strategies.get(model)!));
  const internBody = storage.entities.length ? emitInternRusqlite(storage, rusqliteRustType, rusqliteRustIdent, dialect, false) : undefined;
  const internFile = internBody === undefined ? undefined : internAutoFile(program, storage, internBody, options.existingFile);
  return {
    program, dialect, interned: storage, entities, fieldsByEntity, strategies, writerSections, internFile,
    sourceTypes: [...entities, ...storage.domains.map((domain) => domain.scalar), ...storage.entities.map((entity) => entity.model)],
  };
}

export function emitRusqliteWriter(
  program: Program, fields: ResolvedField[], modelName: string, strategy: RusqliteStrategy,
): string {
  const keyFields = fields.filter((field) => field.isPk);
  const keys = keyFields.map((field) => field.name);
  const autoIncrement = keyFields.length === 1 && keyFields[0].typeName === "integer";
  const keyColumn = keyFields.length === 1 ? sqlColumn(keyFields[0]) : undefined;
  const table = snakeCase(modelName);
  const writable = fields.filter((field) => !(autoIncrement && field.isPk) && !field.isManual);
  const columns = writable.map(sqlColumn);
  const used = new Set(fields.flatMap((field) => [field.name, sqlColumn(field)]));
  const local = (base: string) => {
    let name = base;
    while (used.has(name)) name += "_";
    used.add(name);
    return name;
  };
  const connection = local("conn");
  const savepoint = local("tx");
  const result = local("id");
  const inserted = local("inserted");
  const functionName = strategy === "insert-ignore" ? `insert_${table}` : `upsert_${table}`;
  const returnsId = autoIncrement && strategy === "upsert";
  const parameters = writable.map((field) => {
    const name = rusqliteRustIdent(field.rel ? `${snakeCase(field.name)}_id` : snakeCase(field.name).replace(/\./g, "_"));
    const type = field.rel ? field.nullable ? "Option<i64>" : "i64" : rusqliteRustType(field.typeName, field.nullable);
    return `${name}: ${type === "String" ? "&str" : type === "Option<String>" ? "Option<&str>" : type}`;
  });
  const lines = [`pub fn ${functionName}<C: RusqliteWriteConnection + ?Sized>(`, `    ${connection}: &mut C,`, ...parameters.map((parameter) => `    ${parameter},`), `) -> rusqlite::Result<${returnsId ? "i64" : "()"}> {`, `    let mut ${savepoint} = ${connection}.begin_write()?;`];
  const placeholders = writable.map((_, index) => `?${index + 1}`);
  let sql: string;
  let conflictFields: ResolvedField[] = [];
  let updates: string[] = [];
  if (strategy === "insert-ignore" || strategy === "delete-replace") {
    sql = writable.length ? `INSERT OR IGNORE INTO ${table} (${columns.join(", ")}) VALUES (${placeholders.join(", ")})` : `INSERT OR IGNORE INTO ${table} DEFAULT VALUES`;
  } else {
    sql = writable.length ? `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders.join(", ")})` : `INSERT INTO ${table} DEFAULT VALUES`;
    const unique = fields.flatMap((field) => (getUnique(program, field.prop) ?? []).map((item) => item.fields));
    conflictFields = (unique[0] ?? keys).flatMap((name) => {
      const field = fields.find((candidate) => candidate.name === name);
      return field === undefined ? [] : [field];
    });
    const conflict = conflictFields.map(sqlColumn);
    const keyColumns = keyFields.map(sqlColumn);
    updates = columns.filter((column) => !conflict.includes(column) && !keyColumns.includes(column));
    if (writable.length && conflict.length && updates.length) sql += ` ON CONFLICT(${conflict.join(", ")}) DO UPDATE SET ${updates.map((column) => `${column} = excluded.${column}`).join(", ")}`;
    else if (writable.length && conflict.length) sql += ` ON CONFLICT(${conflict.join(", ")}) DO NOTHING`;
    if (returnsId) sql += ` RETURNING ${keyColumn}`;
  }
  const params = `params![${writable.map((field) => rusqliteRustIdent(field.rel ? `${snakeCase(field.name)}_id` : snakeCase(field.name).replace(/\./g, "_"))).join(", ")}]`;
  if (returnsId && writable.length && conflictFields.length && updates.length === 0) {
    const conflictParams = conflictFields.map((field) => rusqliteRustIdent(field.rel ? `${snakeCase(field.name)}_id` : snakeCase(field.name).replace(/\./g, "_")));
    const select = `SELECT ${keyColumn} FROM ${table} WHERE ${conflictFields.map((field, index) => `${sqlColumn(field)} IS ?${index + 1}`).join(" AND ")}`;
    lines.push(
      `    let ${inserted}: Option<i64> = ${savepoint}.query_row(${JSON.stringify(sql)}, ${params}, |row| row.get(0)).optional()?;`,
      `    let ${result} = match ${inserted} {`,
      `        Some(${result}) => ${result},`,
      `        None => ${savepoint}.query_row(${JSON.stringify(select)}, params![${conflictParams.join(", ")}], |row| row.get(0))?,`,
      "    };",
    );
  } else if (returnsId) lines.push(`    let ${result} = ${savepoint}.query_row(${JSON.stringify(sql)}, ${params}, |row| row.get(0))?;`);
  else lines.push(`    ${savepoint}.execute(${JSON.stringify(sql)}, ${params})?;`);
  lines.push(`    ${savepoint}.commit()?;`, `    Ok(${returnsId ? result : "()"})`, "}");
  return lines.join("\n");
}

export function RusqliteRowStructs(props: { storage: RusqliteStorageParts }) {
  return <>{props.storage.entities.map((model, index) => <>{index > 0 && "\n\n"}
    <StructDeclaration name={model.name} derive={["Debug", "Clone", "Serialize", "Deserialize"]}>
      <List hardline>{props.storage.fieldsByEntity.get(model.name)!.map((field) => <StructField name={rusqliteRowName(field)} type={rusqliteRowType(field)} />)}</List>
    </StructDeclaration>
  </>)}</>;
}
