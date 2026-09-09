import { List } from "@alloy-js/core";
import { StructDeclaration, StructField } from "@hafley/alloy-rs";
import type { Model, Program, Type } from "@typespec/compiler";
import {
  collectModels,
  getAllRelations,
  getUnique,
  internAutoFile,
  internStorage,
  isEntityModel,
  resolvedFields,
  snakeCase,
  sqliteDialect,
  type InternStorage,
  type ResolvedField,
  type SqlDialect,
} from "@hafley/typespec-sql";
import { emitInternRust } from "./2_intern_writer.js";
import { validateSqlxStorage, type SqlxStrategy } from "./1_validate.js";

export const RUST_TYPE: Record<string, string> = {
  string: "String", integer: "i64", int8: "i8", int16: "i16", int32: "i32", int64: "i64",
  uint8: "u8", uint16: "u16", uint32: "u32", uint64: "u64", float: "f64", float32: "f32",
  float64: "f64", boolean: "bool", bytes: "Vec<u8>",
};

const RUST_RESERVED = new Set([
  "as", "async", "await", "break", "const", "continue", "crate", "dyn", "else", "enum", "extern", "false",
  "fn", "for", "if", "impl", "in", "let", "loop", "match", "mod", "move", "mut", "pub", "ref", "return",
  "self", "Self", "static", "struct", "super", "trait", "true", "type", "unsafe", "use", "where", "while",
  "abstract", "become", "box", "do", "final", "macro", "override", "priv", "try", "typeof", "unsized", "virtual", "yield",
]);

export function rustType(type: string, nullable: boolean): string {
  const base = RUST_TYPE[type] ?? "String";
  return nullable ? `Option<${base}>` : base;
}

export function rustIdent(name: string): string { return RUST_RESERVED.has(name) ? `r#${name}` : name; }
export function rowName(field: ResolvedField): string {
  const column = snakeCase(field.name).replace(/\./g, "_");
  return rustIdent(field.rel ? `${column}_id` : column);
}
export function rowType(field: ResolvedField): string {
  return field.rel ? field.nullable ? "Option<i64>" : "i64" : rustType(field.typeName, field.nullable);
}
function sqlColumn(field: ResolvedField): string { return field.rel ? `${snakeCase(field.name)}_id` : snakeCase(field.name); }

export interface SqlxStorageOptions {
  dialect?: SqlDialect;
  existingFile?: string;
  interned?: InternStorage;
  strategyForModel?: (model: Model) => SqlxStrategy;
}

export interface SqlxStorageParts {
  program: Program;
  dialect: SqlDialect;
  interned: InternStorage;
  entities: Model[];
  fieldsByEntity: Map<string, ResolvedField[]>;
  strategies: Map<Model, SqlxStrategy>;
  upsertSections: string[];
  internFile?: string;
  sourceTypes: Type[];
}

export function sqlxStorage(program: Program, options: SqlxStorageOptions = {}): SqlxStorageParts {
  const dialect = options.dialect ?? sqliteDialect;
  const storage = options.interned ?? internStorage(program);
  const strategyForModel = options.strategyForModel ?? (() => "upsert");
  validateSqlxStorage(storage, dialect, strategyForModel);
  const models = collectModels(program.getGlobalNamespaceType());
  const relations = getAllRelations(program);
  const entities = models.filter((model) => isEntityModel(program, model) && !storage.entities.some((entity) => entity.model === model));
  const fieldsByEntity = new Map(entities.map((model) => [model.name, resolvedFields(program, model, relations)]));
  const strategies = new Map(entities.map((model) => [model, strategyForModel(model)]));
  const upsertSections = entities.map((model) => emitUpsertFn(program, fieldsByEntity.get(model.name)!, model.name, strategies.get(model)!));
  const internBody = storage.entities.length ? emitInternRust(storage, rustType, rustIdent, dialect) : undefined;
  const internFile = internBody === undefined ? undefined : internAutoFile(program, storage, internBody, options.existingFile);
  return { program, dialect, interned: storage, entities, fieldsByEntity, strategies, upsertSections, internFile, sourceTypes: [...entities, ...storage.domains.map((domain) => domain.scalar), ...storage.entities.map((entity) => entity.model)] };
}

export function emitUpsertFn(
  program: Program,
  fields: ResolvedField[],
  modelName: string,
  strategy: SqlxStrategy,
): string {
  const keys = fields.filter((field) => field.isPk).map((field) => field.name);
  const autoIncrement = keys.length === 1 && fields.find((field) => field.name === keys[0])?.typeName === "integer";
  const table = snakeCase(modelName);
  const writable = fields.filter((field) => !(autoIncrement && field.isPk) && !field.isManual);
  const columns = writable.map(sqlColumn);
  const placeholders = writable.map(() => "?").join(", ");
  const functionName = strategy === "insert-ignore" ? `insert_${table}` : `upsert_${table}`;
  const parameters = writable.map((field) => {
    const name = rustIdent(field.rel ? `${snakeCase(field.name)}_id` : snakeCase(field.name).replace(/\./g, "_"));
    const type = field.rel ? field.nullable ? "Option<i64>" : "i64" : rustType(field.typeName, field.nullable);
    return `${name}: ${type === "String" ? "&str" : type === "Option<String>" ? "Option<&str>" : type}`;
  });
  const returnsId = autoIncrement && strategy === "upsert";
  const lines = [`pub async fn ${functionName}(`, "    conn: &mut SqliteConnection,", ...parameters.map((parameter) => `    ${parameter},`), `) -> Result<${returnsId ? "i64" : "()"}> {`];
  if (strategy === "insert-ignore" || strategy === "delete-replace") {
    lines.push("    sqlx::query(", `        "INSERT OR IGNORE INTO ${table}`, `         (${columns.join(", ")})`, `         VALUES (${placeholders})"`, "    )");
  } else {
    const unique = fields.flatMap((field) => (getUnique(program, field.prop) ?? []).map((item) => item.fields));
    const conflict = (unique[0] ?? keys).map((name) => fields.find((field) => field.name === name)?.rel ? `${snakeCase(name)}_id` : snakeCase(name));
    const updates = columns.filter((column) => !conflict.includes(column) && !keys.map(snakeCase).includes(column));
    lines.push(returnsId ? "    let id: i64 = sqlx::query_scalar(" : "    sqlx::query(", `        "INSERT INTO ${table}`, `         (${columns.join(", ")})`, `         VALUES (${placeholders})`);
    if (conflict.length && updates.length) lines.push(`         ON CONFLICT(${conflict.join(", ")}) DO UPDATE SET`, `             ${updates.map((column) => `${column} = excluded.${column}`).join(",\n             ")}`);
    else if (conflict.length) lines.push(`         ON CONFLICT(${conflict.join(", ")}) DO NOTHING`);
    lines.push(returnsId ? "         RETURNING id\"" : "        \"", "    )");
  }
  for (const field of writable) lines.push(`    .bind(${rustIdent(field.rel ? `${snakeCase(field.name)}_id` : snakeCase(field.name).replace(/\./g, "_"))})`);
  if (returnsId) lines.push("    .fetch_one(conn)", "    .await?;", "    Ok(id)");
  else lines.push("    .execute(conn)", "    .await?;", "    Ok(())");
  lines.push("}");
  return lines.join("\n");
}

export function SqlxRowStructs(props: { storage: SqlxStorageParts }) {
  return <>{props.storage.entities.map((model, index) => {
    const fields = props.storage.fieldsByEntity.get(model.name)!;
    return <>{index > 0 && "\n\n"}<StructDeclaration name={model.name} derive={["Debug", "Clone", "Serialize", "Deserialize"]}>
      <List hardline>{fields.map((field) => <StructField name={rowName(field)} type={rowType(field)} />)}</List>
    </StructDeclaration></>;
  })}</>;
}
