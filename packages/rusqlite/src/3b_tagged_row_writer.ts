import type { Enum, Model, ModelProperty, Namespace, Program, Scalar, Type, Union } from "@typespec/compiler";
import { getAllRelations, internStorage, sqliteDialect, type SqlDialect } from "@hafley/typespec-sql";

export interface RusqliteTaggedSourceField {
  property: string;
  rustName: string;
}

export interface RusqliteTaggedRowWriterOptions {
  namespace: string;
  discriminator: string;
  sourceFields: RusqliteTaggedSourceField[];
  ordinalSourceField: string;
  jsonScalars?: string[];
  dialect?: SqlDialect;
}

interface Presence {
  type: Type;
  optional: boolean;
  nullable: boolean;
}

interface Column extends Presence {
  name: string;
  path: ModelProperty[];
}

interface Entity {
  model: Model;
  tag: string;
  columns: Column[];
}

const RESERVED = new Set([
  "as", "async", "await", "break", "const", "continue", "crate", "dyn", "else", "enum", "extern", "false",
  "fn", "for", "if", "impl", "in", "let", "loop", "match", "mod", "move", "mut", "pub", "ref", "return",
  "self", "Self", "static", "struct", "super", "trait", "true", "type", "unsafe", "use", "where", "while", "yield",
]);

function ident(name: string): string { return RESERVED.has(name) ? `r#${name}` : name; }
function quote(name: string): string { return `"${name.replaceAll('"', '""')}"`; }

function namespaceAt(program: Program, path: string): Namespace {
  let namespace = program.getGlobalNamespaceType();
  for (const part of path.split(".")) {
    const child = namespace.namespaces.get(part);
    if (!child) throw new Error(`Missing TypeSpec namespace: ${path}`);
    namespace = child;
  }
  return namespace;
}

function unwrap(property: ModelProperty, inheritedOptional = false, inheritedNullable = false): Presence {
  let type = property.type;
  let nullable = inheritedNullable;
  if (type.kind === "Union") {
    const variants = [...type.variants.values()].map((variant) => variant.type);
    const nonNull = variants.filter((candidate) => !(candidate.kind === "Intrinsic" && candidate.name === "null"));
    if (nonNull.length !== 1 || nonNull.length === variants.length) {
      throw new Error(`Unsupported tagged-row union at ${property.model?.name}.${property.name}`);
    }
    [type] = nonNull;
    nullable = true;
  }
  return { type, optional: inheritedOptional || property.optional, nullable };
}

function scalarName(type: Scalar): string {
  const meaningful = new Set(["string", "boolean", "uint8", "uint16", "uint32", "uint64", "int8", "int16", "int32", "int64", "integer", "float32", "float64"]);
  let current = type;
  while (current.baseScalar && !meaningful.has(current.name)) current = current.baseScalar;
  return current.name;
}

function isArray(type: Type): boolean {
  return type.kind === "Model" && type.indexer !== undefined;
}

function rustBase(type: Type, jsonScalars: Set<string>): string {
  if (type.kind === "String") return "String";
  if (type.kind === "Enum" || type.kind === "Model" || type.kind === "Union") {
    if (type.kind === "Model" && isArray(type)) return `Vec<${rustBase(type.indexer!.value, jsonScalars)}>`;
    if (!type.name) throw new Error(`Anonymous ${type.kind} cannot be emitted as a Rust field`);
    return ident(type.name);
  }
  if (type.kind === "Tuple") return `(${type.values.map((item) => rustBase(item, jsonScalars)).join(", ")})`;
  if (type.kind !== "Scalar") throw new Error(`Unsupported tagged-row Rust type: ${type.kind}`);
  if (jsonScalars.has(type.name)) return "serde_json::Value";
  const names: Record<string, string> = {
    string: "String", boolean: "bool", uint8: "u8", uint16: "u16", uint32: "u32", uint64: "u64",
    int8: "i8", int16: "i16", int32: "i32", int64: "i64", integer: "i64", float32: "f32", float64: "f64",
  };
  const name = scalarName(type);
  const result = names[name];
  if (!result) throw new Error(`Unsupported tagged-row scalar: ${type.name}`);
  return result;
}

function rustFieldType(presence: Presence, jsonScalars: Set<string>): string {
  const base = rustBase(presence.type, jsonScalars);
  return presence.optional || presence.nullable ? `Option<${base}>` : base;
}

function serdePresence(presence: Presence): string | undefined {
  if (presence.optional && !presence.nullable) return '#[serde(default, skip_serializing_if = "Option::is_none", deserialize_with = "super::optional_non_null")]';
  if (presence.optional && presence.nullable) return '#[serde(default, skip_serializing_if = "Option::is_none")]';
  if (!presence.optional && presence.nullable) return '#[serde(deserialize_with = "super::required_nullable")]';
  return undefined;
}

function collectColumns(model: Model, excluded: Set<string>, prefix: ModelProperty[] = [], inheritedOptional = false, inheritedNullable = false): Column[] {
  const columns: Column[] = [];
  for (const property of model.properties.values()) {
    if (prefix.length === 0 && excluded.has(property.name)) continue;
    const presence = unwrap(property, inheritedOptional, inheritedNullable);
    const path = [...prefix, property];
    if (presence.type.kind === "Model" && !isArray(presence.type)) {
      columns.push(...collectColumns(presence.type, new Set(), path, presence.optional, presence.nullable));
    } else {
      columns.push({ ...presence, name: path.map((part) => part.name).join("__"), path });
    }
  }
  return columns;
}

function rustValue(type: Type, expression: string, optional: boolean, jsonScalars: Set<string>, jsonLocal: string | undefined): string {
  if (jsonLocal) return `&${jsonLocal}`;
  if (type.kind === "Enum") return optional ? `${expression}.as_ref().map(${ident(type.name)}::as_str)` : `${expression}.as_str()`;
  if (type.kind === "Scalar" && scalarName(type) === "uint64") return optional ? `${expression}.map(u64_value)` : `u64_value(${expression})`;
  if (type.kind === "String" || type.kind === "Scalar" && scalarName(type) === "string") return optional ? `${expression}.as_deref()` : `${expression}.as_str()`;
  return expression;
}

function emitEnum(type: Enum): string {
  const members = [...type.members.values()];
  return [
    "#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]",
    `pub enum ${ident(type.name)} {`,
    ...members.map((member) => `    #[serde(rename = ${JSON.stringify(String(member.value ?? member.name))})]\n    ${ident(member.name)},`),
    "}",
    `impl ${ident(type.name)} {`,
    "    pub(super) fn as_str(&self) -> &'static str {",
    "        match self {",
    ...members.map((member) => `            Self::${ident(member.name)} => ${JSON.stringify(String(member.value ?? member.name))},`),
    "        }",
    "    }",
    "}",
  ].join("\n");
}

function emitUnion(type: Union, jsonScalars: Set<string>): string {
  if (!type.name) throw new Error("Anonymous non-null union cannot be emitted");
  return [
    "#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]",
    "#[serde(untagged)]",
    `pub enum ${ident(type.name)} {`,
    ...[...type.variants.values()].map((variant) => `    ${ident(String(variant.name))}(${rustBase(variant.type, jsonScalars)}),`),
    "}",
  ].join("\n");
}

function emitModel(model: Model, jsonScalars: Set<string>, excluded = new Set<string>()): string {
  if (isArray(model)) return "";
  const fields = [...model.properties.values()].filter((property) => !excluded.has(property.name)).map((property) => {
    const presence = unwrap(property);
    const attribute = serdePresence(presence);
    return `${attribute ? `    ${attribute}\n` : ""}    pub ${ident(property.name)}: ${rustFieldType(presence, jsonScalars)},`;
  });
  return ["#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]", "#[serde(deny_unknown_fields)]", `pub struct ${ident(model.name)} {`, ...fields, "}"].join("\n");
}

function referencedTypes(entities: Entity[]): Type[] {
  const found = new Map<string, Type>();
  const add = (key: string, type: Type) => {
    const existing = found.get(key);
    if (existing && existing !== type) throw new Error(`Rust type name collision across namespaces: ${key}`);
    found.set(key, type);
  };
  const visit = (type: Type) => {
    if (type.kind === "Union") {
      const nonNull = [...type.variants.values()].map((variant) => variant.type).filter((item) => !(item.kind === "Intrinsic" && item.name === "null"));
      if (nonNull.length === 1 && nonNull.length !== type.variants.size) return visit(nonNull[0]);
      if (type.name) {
        const key = type.name;
        const first = !found.has(key);
        add(key, type);
        if (first) for (const variant of type.variants.values()) visit(variant.type);
      }
    } else if (type.kind === "Model") {
      if (isArray(type)) return visit(type.indexer!.value);
      if (type.name) {
        const key = type.name;
        const first = !found.has(key);
        add(key, type);
        if (first) for (const property of type.properties.values()) visit(property.type);
      }
    } else if (type.kind === "Enum") add(type.name, type);
    else if (type.kind === "Tuple") for (const item of type.values) visit(item);
  };
  for (const entity of entities) for (const property of entity.model.properties.values()) visit(property.type);
  const entityModels = new Set(entities.map((entity) => entity.model));
  return [...found.values()].filter((type) => type.kind !== "Model" || !entityModels.has(type));
}

/** Emit strict serde input models plus typed, static rusqlite inserts for a string-tagged model family. */
export function emitRusqliteTaggedRowWriter(program: Program, options: RusqliteTaggedRowWriterOptions): string {
  const dialect = options.dialect ?? sqliteDialect;
  if (dialect.name !== "sqlite") throw new Error(`rusqlite tagged-row writers support only sqlite, received ${dialect.name}`);
  const namespace = namespaceAt(program, options.namespace);
  const interned = internStorage(program);
  if (interned.domains.length || interned.entities.length) {
    throw new Error("tagged-row writers do not support interned storage; emit interned bindings separately");
  }
  if (getAllRelations(program).size) {
    throw new Error("tagged-row writers do not support relations; emit relation bindings separately");
  }
  const sourceNames = new Set(options.sourceFields.map((field) => field.property));
  const ordinal = options.sourceFields.find((field) => field.property === options.ordinalSourceField);
  if (!ordinal) throw new Error(`Ordinal source field is not configured: ${options.ordinalSourceField}`);
  const excluded = new Set([...sourceNames, options.discriminator]);
  const jsonScalars = new Set(options.jsonScalars ?? []);
  const entities: Entity[] = [];
  for (const model of namespace.models.values()) {
    const tag = model.properties.get(options.discriminator)?.type;
    if (tag?.kind !== "String") continue;
    entities.push({ model, tag: tag.value, columns: collectColumns(model, excluded) });
  }
  if (!entities.length) throw new Error(`No string-tagged models in ${options.namespace}`);
  const tags = entities.map((entity) => entity.tag);
  if (new Set(tags).size !== tags.length) throw new Error("Duplicate tagged-row discriminator values");
  for (const entity of entities) {
    const columns = entity.columns.map((column) => column.name);
    if (new Set(columns).size !== columns.length) throw new Error(`Flattened SQL column collision in ${entity.model.name}`);
  }
  const sourceProperties = options.sourceFields.map((source) => {
    const property = entities[0].model.properties.get(source.property);
    if (!property) throw new Error(`Missing source field ${source.property}`);
    return { source, presence: unwrap(property) };
  });
  for (const entity of entities) for (const [index, configured] of options.sourceFields.entries()) {
    const property = entity.model.properties.get(configured.property);
    if (!property) throw new Error(`Missing source field ${configured.property} in ${entity.model.name}`);
    const actual = unwrap(property);
    const expected = sourceProperties[index].presence;
    if (rustFieldType(actual, jsonScalars) !== rustFieldType(expected, jsonScalars)
      || actual.optional !== expected.optional || actual.nullable !== expected.nullable) {
      throw new Error(`Source field shape differs in ${entity.model.name}.${configured.property}`);
    }
  }
  const ordinalPresence = sourceProperties[options.sourceFields.indexOf(ordinal)].presence;
  if (ordinalPresence.optional || ordinalPresence.nullable || ordinalPresence.type.kind !== "Scalar" || scalarName(ordinalPresence.type) !== "int64") {
    throw new Error(`Ordinal source field must be required int64: ${options.ordinalSourceField}`);
  }
  const quoteIdentifier = dialect.quoteIdentifier.bind(dialect);
  const nested = referencedTypes(entities).map((type) => {
    if (type.kind === "Enum") return emitEnum(type);
    if (type.kind === "Union") return emitUnion(type, jsonScalars);
    if (type.kind === "Model") return emitModel(type, jsonScalars);
    return "";
  }).filter(Boolean);
  const models = entities.map((entity) => emitModel(entity.model, jsonScalars, excluded));
  const inserts = entities.map((entity) => {
    const allColumns = [...options.sourceFields.map((field) => field.property), options.discriminator, ...entity.columns.map((column) => column.name)];
    const sql = `INSERT INTO ${quoteIdentifier(entity.tag)} (${allColumns.map(quoteIdentifier).join(", ")}) VALUES (${allColumns.map((_, index) => dialect.placeholder(index + 1)).join(", ")})`;
    const locals: string[] = [];
    const values = options.sourceFields.map((field) => `source.${ident(field.rustName)}`).concat(JSON.stringify(entity.tag));
    for (const column of entity.columns) {
      const expression = `self.${column.path.map((property) => ident(property.name)).join(".")}`;
      const optionalParent = column.path.slice(0, -1).findIndex((property) => {
        const presence = unwrap(property);
        return presence.optional || presence.nullable;
      });
      const isJson = isArray(column.type) || column.type.kind === "Scalar" && jsonScalars.has(column.type.name);
      let local: string | undefined;
      if (isJson) {
        local = `${column.name}_json`;
        locals.push(column.optional || column.nullable
          ? `        let ${local} = self.${ident(column.path[0].name)}.as_ref().map(serde_json::to_string).transpose()?;`
          : `        let ${local} = serde_json::to_string(&${expression})?;`);
      }
      if (optionalParent >= 0) {
        if (local || column.path.length !== 2) throw new Error(`Unsupported optional nested path: ${entity.model.name}.${column.name}`);
        const parent = ident(column.path[0].name);
        const leaf = ident(column.path[1].name);
        let mapped = `value.${leaf}`;
        if (column.type.kind === "String" || column.type.kind === "Scalar" && scalarName(column.type) === "string") mapped += ".as_str()";
        else if (column.type.kind === "Enum") mapped += ".as_str()";
        else if (column.type.kind === "Scalar" && scalarName(column.type) === "uint64") mapped = `u64_value(${mapped})`;
        values.push(`self.${parent}.as_ref().map(|value| ${mapped})`);
      } else {
        values.push(rustValue(column.type, expression, column.optional || column.nullable, jsonScalars, local));
      }
    }
    return [
      `impl models::${ident(entity.model.name)} {`,
      "    pub fn insert(&self, conn: &rusqlite::Connection, source: &Source<'_>) -> Result<usize, InsertError> {",
      ...locals,
      `        Ok(conn.prepare_cached(${JSON.stringify(sql)})?.execute(rusqlite::params![${values.join(", ")}])?)`,
      "    }",
      "}",
    ].join("\n");
  });
  return [
    "// Generated typed SQLite rows and writers. Do not edit.",
    "#[derive(Debug)]",
    "pub enum InsertError { Sql(rusqlite::Error), Json(serde_json::Error), OrdinalOverflow }",
    "impl std::fmt::Display for InsertError { fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result { write!(f, \"{self:?}\") } }",
    "impl std::error::Error for InsertError {}",
    "impl From<rusqlite::Error> for InsertError { fn from(value: rusqlite::Error) -> Self { Self::Sql(value) } }",
    "impl From<serde_json::Error> for InsertError { fn from(value: serde_json::Error) -> Self { Self::Json(value) } }",
    "fn u64_value(value: u64) -> rusqlite::types::Value {",
    "    match i64::try_from(value) { Ok(value) => rusqlite::types::Value::Integer(value), Err(_) => rusqlite::types::Value::Text(value.to_string()) }",
    "}",
    "fn optional_non_null<'de, D: serde::Deserializer<'de>, T: serde::Deserialize<'de>>(deserializer: D) -> Result<Option<T>, D::Error> {",
    "    <Option<T> as serde::Deserialize>::deserialize(deserializer)?.map(Some).ok_or_else(|| serde::de::Error::custom(\"null is not allowed\"))",
    "}",
    "fn required_nullable<'de, D: serde::Deserializer<'de>, T: serde::Deserialize<'de>>(deserializer: D) -> Result<Option<T>, D::Error> { <Option<T> as serde::Deserialize>::deserialize(deserializer) }",
    "#[derive(Clone, Copy)]",
    "pub struct Source<'a> {",
    ...sourceProperties.map(({ source, presence }) => `    pub ${ident(source.rustName)}: ${rustFieldType(presence, jsonScalars).replaceAll("String", "&'a str")},`),
    "}",
    "pub mod models {",
    ...nested.map((code) => code.split("\n").map((line) => `    ${line}`).join("\n")),
    ...models.map((code) => code.split("\n").map((line) => `    ${line}`).join("\n")),
    "}",
    "#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]",
    `#[serde(tag = ${JSON.stringify(options.discriminator)})]`,
    "pub enum Fact {",
    ...entities.map((entity) => `    #[serde(rename = ${JSON.stringify(entity.tag)})]\n    ${ident(entity.model.name)}(models::${ident(entity.model.name)}),`),
    "}",
    "impl Fact {",
    "    pub fn insert(&self, conn: &rusqlite::Connection, source: &Source<'_>) -> Result<usize, InsertError> {",
    "        match self {",
    ...entities.map((entity) => `            Self::${ident(entity.model.name)}(row) => row.insert(conn, source),`),
    "        }",
    "    }",
    "}",
    `pub const TABLE_COUNT: usize = ${entities.length};`,
    "pub fn insert_all(conn: &rusqlite::Connection, source: &Source<'_>, rows: &[Fact]) -> Result<usize, InsertError> {",
    "    if rows.is_empty() { return Ok(0); }",
    `    source.${ident(ordinal.rustName)}.checked_add(i64::try_from(rows.len() - 1).map_err(|_| InsertError::OrdinalOverflow)?)`,
    "        .ok_or(InsertError::OrdinalOverflow)?;",
    "    let mut inserted = 0;",
    "    for (index, row) in rows.iter().enumerate() {",
    `        let row_source = Source { ${options.sourceFields.map((field) => `${ident(field.rustName)}: source.${ident(field.rustName)}${field === ordinal ? " + index as i64" : ""}`).join(", ")} };`,
    "        inserted += row.insert(conn, &row_source)?;",
    "    }",
    "    Ok(inserted)",
    "}",
    ...inserts,
  ].join("\n\n") + "\n";
}
