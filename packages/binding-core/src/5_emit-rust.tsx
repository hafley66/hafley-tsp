// Rust emitter -- walks the TSP program graph directly via decorator accessors.
// Uses alloy-rs JSX for structs, string concat for functions.

import { Output, render, List, SourceFile, type OutputDirectory } from "@alloy-js/core";
import { internStorage } from "./2a_intern.js";
import { emitInternRust, internAutoFile } from "./4a_emit_intern.js";
import {
  StructDeclaration, StructField, EnumDeclaration, TupleVariant,
  ReplaceFile, AutoZone, ManualZone, CrateDirectory, VisibilityContext,
} from "@hafley/alloy-rs";

import type { Model, Program } from "@typespec/compiler";
import {
  resolvedFields, resolveFieldType, collectModels, isEntityModel, snakeCase,
  resolveRelTarget, extractChain, type ResolvedField,
} from "./2_facts.js";
import {
  isPk, isManual, getUnique, getDefault, hasDefault,
  getBinding, hasBinding, getAllRelations,
  getSyncStrategy, hasSyncStrategy,
  isSourceGraphql, getSourceRest, hasSourceRest, isSourcePaginated,
  getSourcePollInterval, hasSourcePollInterval, getSourceNested,
  getSourceFreshness, hasSourceFreshness, getAllSourceNested,
  isConfigSource, hasConfigEnv, getConfigEnv, isConfigSecret,
  hasConfigPath, getConfigPath,
  isCliCommand, isCliFlag, hasCliArg, getCliArg, hasCliShort, getCliShort,
  hasCliAbout, getCliAbout, getCliSubcommand,
  isHttpRouter, getHttpRoutes, getHttpState,
  type RelationDef,
} from "./decorators.js";

// ── Type mapping ──────────────────────────────────────────

const RUST_TYPE: Record<string, string> = {
  string: "String", integer: "i64",
  int8: "i8", int16: "i16", int32: "i32", int64: "i64",
  uint8: "u8", uint16: "u16", uint32: "u32", uint64: "u64",
  float: "f64", float32: "f32", float64: "f64",
  boolean: "bool", bytes: "Vec<u8>",
};

function rustType(t: string, nullable: boolean): string {
  const base = RUST_TYPE[t] ?? "String";
  return nullable ? `Option<${base}>` : base;
}

const RUST_RESERVED = new Set([
  "as", "async", "await", "break", "const", "continue", "crate", "dyn",
  "else", "enum", "extern", "false", "fn", "for", "if", "impl", "in",
  "let", "loop", "match", "mod", "move", "mut", "pub", "ref", "return",
  "self", "Self", "static", "struct", "super", "trait", "true", "type",
  "unsafe", "use", "where", "while", "abstract", "become", "box", "do",
  "final", "macro", "override", "priv", "try", "typeof", "unsized",
  "virtual", "yield",
]);

function rustIdent(name: string): string { return RUST_RESERVED.has(name) ? `r#${name}` : name; }

// ── Per-field helpers ─────────────────────────────────────

function rowName(f: ResolvedField): string {
  const col = snakeCase(f.name).replace(/\./g, "_");
  return rustIdent(f.rel ? `${col}_id` : col);
}

function rowType(f: ResolvedField): string {
  return f.rel ? (f.nullable ? "Option<i64>" : "i64") : rustType(f.typeName, f.nullable);
}

function sqlCol(f: ResolvedField): string {
  return f.rel ? `${snakeCase(f.name)}_id` : snakeCase(f.name);
}

// ── Upsert function emitter (string) ─────────────────────

function emitUpsertFn(program: Program, fields: ResolvedField[], modelName: string): string {
  const pks = fields.filter(f => f.isPk).map(f => f.name);
  const isAutoIncr = pks.length === 1 && fields.find(f => f.name === pks[0])?.typeName === "integer";
  const strategy = hasSyncStrategy(program, fields[0].prop.model!) ? getSyncStrategy(program, fields[0].prop.model!) : "upsert";
  const tableName = snakeCase(modelName);

  const upsertFields = fields.filter(f => !(isAutoIncr && f.isPk) && !f.isManual);
  const colNames = upsertFields.map(sqlCol);
  const placeholders = upsertFields.map(() => "?").join(", ");
  const fnName = strategy === "insert-ignore" ? `insert_${tableName}` : `upsert_${tableName}`;

  const params = upsertFields.map(f => {
    const paramName = rustIdent(f.rel ? `${snakeCase(f.name)}_id` : snakeCase(f.name).replace(/\./g, "_"));
    const ty = f.rel ? (f.nullable ? "Option<i64>" : "i64") : rustType(f.typeName, f.nullable);
    const paramTy = ty === "String" ? "&str" : ty === "Option<String>" ? "Option<&str>" : ty;
    return `${paramName}: ${paramTy}`;
  });

  const returnsId = isAutoIncr && strategy === "upsert";
  const lines: string[] = [];
  lines.push(`pub async fn ${fnName}(`, `    conn: &mut SqliteConnection,`);
  for (const p of params) lines.push(`    ${p},`);
  lines.push(`) -> Result<${returnsId ? "i64" : "()"}> {`);

  if (strategy === "insert-ignore" || strategy === "delete-replace") {
    lines.push(`    sqlx::query(`, `        "INSERT OR IGNORE INTO ${tableName}`);
    lines.push(`         (${colNames.join(", ")})`, `         VALUES (${placeholders})"`, `    )`);
  } else {
    const uniques: string[][] = [];
    for (const f of fields) { for (const u of (getUnique(program, f.prop) ?? [])) uniques.push(u.fields); }

    const conflictCols = (uniques.length > 0 ? uniques[0] : pks).map(n => {
      const f = fields.find(fv => fv.name === n);
      return f?.rel ? `${snakeCase(n)}_id` : snakeCase(n);
    });
    const updateCols = colNames.filter(c => !conflictCols.includes(c) && !pks.map(p => snakeCase(p)).includes(c));

    if (returnsId) lines.push(`    let id: i64 = sqlx::query_scalar(`);
    else lines.push(`    sqlx::query(`);

    lines.push(`        "INSERT INTO ${tableName}`, `         (${colNames.join(", ")})`, `         VALUES (${placeholders})`);
    if (conflictCols.length > 0 && updateCols.length > 0) {
      lines.push(`         ON CONFLICT(${conflictCols.join(", ")}) DO UPDATE SET`);
      lines.push(`             ${updateCols.map(c => `${c} = excluded.${c}`).join(",\n             ")}`);
    } else if (conflictCols.length > 0) {
      lines.push(`         ON CONFLICT(${conflictCols.join(", ")}) DO NOTHING`);
    }
    lines.push(returnsId ? `         RETURNING id"` : `        "`);
    lines.push(`    )`);
  }

  for (const f of upsertFields) {
    const paramName = rustIdent(f.rel ? `${snakeCase(f.name)}_id` : snakeCase(f.name).replace(/\./g, "_"));
    lines.push(`    .bind(${paramName})`);
  }

  if (strategy === "upsert" && returnsId) lines.push(`    .fetch_one(conn)`, `    .await?;`, `    Ok(id)`);
  else lines.push(`    .execute(conn)`, `    .await?;`, `    Ok(())`);
  lines.push(`}`);
  return lines.join("\n");
}

// ── JSON extraction emitter (string) ─────────────────────

function emitJsonAccess(expr: string, typeName: string, nullable: boolean): string {
  const base = RUST_TYPE[typeName] ?? "String";
  if (base === "String") return nullable ? `${expr}.as_str().map(|s| s.to_owned())` : `${expr}.as_str().unwrap_or("").to_owned()`;
  if (base === "i64") return nullable ? `${expr}.as_i64()` : `${expr}.as_i64().unwrap_or(0)`;
  if (base === "bool") return nullable ? `${expr}.as_bool()` : `${expr}.as_bool().unwrap_or(false)`;
  if (base === "f64") return nullable ? `${expr}.as_f64()` : `${expr}.as_f64().unwrap_or(0.0)`;
  return nullable ? `${expr}.as_str().map(|s| s.to_owned())` : `${expr}.as_str().unwrap_or("").to_owned()`;
}

function emitExtractFn(program: Program, bindingModel: Model, relMap: Map<string, RelationDef[]>): string {
  const binding = getBinding(program, bindingModel)!;
  const target = binding.targetModel;
  const source = binding.sourceModel;
  const fields = resolvedFields(program, target, relMap);
  const pks = fields.filter(f => f.isPk).map(f => f.name);
  const isAutoIncr = pks.length === 1 && fields.find(f => f.name === pks[0])?.typeName === "integer";

  const fieldMapByTarget = new Map<string, string[]>();
  const explicit = new Set<string>();
  for (const [, prop] of bindingModel.properties) {
    explicit.add(prop.name);
    const chain = extractChain(prop.type);
    if (chain.length > 0) fieldMapByTarget.set(prop.name, chain);
  }

  const sourceNames = new Set([...source.properties.keys()]);
  const autoSet = new Set<string>();
  for (const [, prop] of target.properties) {
    if (explicit.has(prop.name) || prop.name.includes(".") || prop.name.startsWith("_")) continue;
    if (sourceNames.has(prop.name)) autoSet.add(prop.name);
  }

  const fnName = `extract_${snakeCase(target.name)}`;
  const lines: string[] = [];
  lines.push(`/// Extract ${target.name} fields from a ${source.name} JSON value.`);
  lines.push(`pub fn ${fnName}(src: &serde_json::Value) -> ${target.name}Fields {`);

  const boundFields: { ident: string }[] = [];
  for (const f of fields) {
    if (f.rel || f.isManual || (isAutoIncr && f.isPk)) continue;
    const ident = rustIdent(snakeCase(f.name).replace(/\./g, "_"));
    const chain = fieldMapByTarget.get(f.name);

    if (chain) {
      const jsonPath = chain.map(link => { const dot = link.indexOf("."); return dot >= 0 ? link.substring(dot + 1) : link; });
      const accessor = jsonPath.map(p => `["${p}"]`).join("");
      lines.push(`    let ${ident} = ${emitJsonAccess(`src${accessor}`, f.typeName, f.nullable)};`);
      boundFields.push({ ident });
    } else if (f.isDotPath) {
      const accessor = f.name.split(".").map(p => `["${p}"]`).join("");
      lines.push(`    let ${ident} = ${emitJsonAccess(`src${accessor}`, f.typeName, f.nullable)};`);
      boundFields.push({ ident });
    } else if (autoSet.has(f.name)) {
      lines.push(`    let ${ident} = ${emitJsonAccess(`src["${f.name}"]`, f.typeName, f.nullable)};`);
      boundFields.push({ ident });
    }
  }

  lines.push(`    ${target.name}Fields {`);
  for (const { ident } of boundFields) lines.push(`        ${ident},`);
  lines.push(`    }`, `}`);
  return lines.join("\n");
}

// ── Sync trait + supporting types ────────────────────────

function emitSyncTrait(): string {
  return `/// Request descriptor for a sync operation.
#[derive(Debug, Clone)]
pub struct SyncRequest {
    pub method: &'static str,
    pub endpoint: String,
    pub paginated: bool,
    pub etag: Option<String>,
    pub last_modified: Option<String>,
}

/// Response from a sync transport call.
#[derive(Debug)]
pub struct SyncResponse {
    pub status: u16,
    pub body: serde_json::Value,
    pub etag: Option<String>,
    pub last_modified: Option<String>,
}

impl SyncResponse {
    pub fn is_not_modified(&self) -> bool { self.status == 304 }
}

/// Persisted poll state for an endpoint.
#[derive(Debug, Clone, Default)]
pub struct SyncPollState {
    pub etag: Option<String>,
    pub last_modified: Option<String>,
    pub poll_interval: Option<i64>,
    pub last_polled_at: Option<String>,
}

/// Implement this trait to provide transport + persistence for sync functions.
#[async_trait::async_trait]
pub trait SyncClient {
    async fn rest_call(&self, conn: &mut SqliteConnection, req: &SyncRequest) -> Result<SyncResponse>;
    async fn graphql_call(&self, conn: &mut SqliteConnection, endpoint: &str, query: &str) -> Result<serde_json::Value>;
    async fn get_poll_state(&self, conn: &mut SqliteConnection, endpoint: &str) -> Result<SyncPollState>;
    async fn set_poll_state(&self, conn: &mut SqliteConnection, endpoint: &str, state: &SyncPollState) -> Result<()>;
}`;
}

// ── Sync pipeline emitter (string) ───────────────────────

interface NestedChildInfo {
  sourceModelName: string;
  targetModel: Model;
  path: string;
  strategy: string;
  tableName: string;
  fields: ResolvedField[];
  upsertArgs: string[];
  upsertFn: string;
  hasBinding: boolean;
}

function emitSyncFn(
  program: Program, model: Model, relMap: Map<string, RelationDef[]>,
  allModels: Model[], nestedMap: Map<string, import("./decorators.js").NestedDef>,
): string {
  const fields = resolvedFields(program, model, relMap);
  const pks = fields.filter(f => f.isPk).map(f => f.name);
  const isAutoIncr = pks.length === 1 && fields.find(f => f.name === pks[0])?.typeName === "integer";
  const strategy = hasSyncStrategy(program, model) ? getSyncStrategy(program, model) : "upsert";

  // Find the binding that targets this entity
  let sourceModel: Model | undefined;
  for (const m of allModels) {
    if (!hasBinding(program, m)) continue;
    const b = getBinding(program, m)!;
    if (b.targetModel.name === model.name) { sourceModel = b.sourceModel; break; }
  }
  if (!sourceModel) return "";

  const isGql = isSourceGraphql(program, sourceModel);
  const restPath = hasSourceRest(program, sourceModel) ? getSourceRest(program, sourceModel) : undefined;
  if (!isGql && !restPath) return "";

  const freshness = hasSourceFreshness(program, sourceModel) ? getSourceFreshness(program, sourceModel) : "etag";
  const pollInterval = hasSourcePollInterval(program, sourceModel) ? getSourcePollInterval(program, sourceModel) : undefined;
  const paginated = isSourcePaginated(program, sourceModel);

  const tableName = snakeCase(model.name);
  const fnName = `sync_${tableName}`;
  const parentRel = fields.find(f => f.rel?.kind === "belongsTo");

  // Collect nested children: source models with @Source.nested pointing to our source model
  const nestedChildren: NestedChildInfo[] = [];
  for (const [childSourceName, nestedDef] of nestedMap) {
    if (nestedDef.parent !== sourceModel.name) continue;
    // Find the entity that this child source maps to via a binding
    for (const m of allModels) {
      if (!hasBinding(program, m)) continue;
      const b = getBinding(program, m)!;
      if (b.sourceModel.name !== childSourceName) continue;
      const childTarget = b.targetModel;
      const childFields = resolvedFields(program, childTarget, relMap);
      const childPks = childFields.filter(f => f.isPk).map(f => f.name);
      const childAutoIncr = childPks.length === 1 && childFields.find(f => f.name === childPks[0])?.typeName === "integer";
      const childStrategy = hasSyncStrategy(program, childTarget) ? getSyncStrategy(program, childTarget)! : "upsert";
      const childTableName = snakeCase(childTarget.name);

      const childUpsertArgs: string[] = [];
      for (const f of childFields) {
        if (childAutoIncr && f.isPk) continue;
        if (f.isManual) continue;
        if (f.rel) {
          childUpsertArgs.push(`${snakeCase(f.name)}_id`);
        } else {
          const ident = rustIdent(snakeCase(f.name).replace(/\./g, "_"));
          const base = RUST_TYPE[f.typeName] ?? "String";
          if (base === "String" && !f.nullable) childUpsertArgs.push(`&child_fields.${ident}`);
          else if (base === "String" && f.nullable) childUpsertArgs.push(`child_fields.${ident}.as_deref()`);
          else childUpsertArgs.push(`child_fields.${ident}`);
        }
      }

      nestedChildren.push({
        sourceModelName: childSourceName,
        targetModel: childTarget,
        path: nestedDef.path,
        strategy: childStrategy,
        tableName: childTableName,
        fields: childFields,
        upsertArgs: childUpsertArgs,
        upsertFn: childStrategy === "insert-ignore" ? `insert_${childTableName}` : `upsert_${childTableName}`,
        hasBinding: true,
      });
    }
  }

  // Extract path params from REST endpoint template
  const pathParams: string[] = [];
  if (!isGql && restPath) {
    for (const m of restPath.matchAll(/\{(\w+)\}/g)) {
      pathParams.push(m[1]);
    }
  }

  // --- Function signature ---
  const lines: string[] = [];
  lines.push(`pub async fn ${fnName}(`);
  lines.push(`    conn: &mut SqliteConnection,`);
  lines.push(`    client: &dyn SyncClient,`);
  if (parentRel) lines.push(`    ${snakeCase(parentRel.name)}_id: i64,`);
  for (const p of pathParams) lines.push(`    ${snakeCase(p)}: &str,`);
  lines.push(`) -> Result<()> {`);

  // --- REST transport ---
  if (!isGql) {
    const endpoint = restPath ?? `/${tableName}`;
    const endpointExpr = pathParams.length > 0
      ? `format!("${endpoint}")`
      : `"${endpoint}".to_owned()`;
    lines.push(`    let endpoint = ${endpointExpr};`);
    lines.push(`    let poll = client.get_poll_state(conn, &endpoint).await?;`);
    lines.push(``);

    // Poll interval check
    if (pollInterval) {
      lines.push(`    if let (Some(interval), Some(ref last_polled)) = (poll.poll_interval, &poll.last_polled_at) {`);
      lines.push(`        if let Ok(last) = chrono::DateTime::parse_from_rfc3339(last_polled) {`);
      lines.push(`            let elapsed = chrono::Utc::now().signed_duration_since(last).num_seconds();`);
      lines.push(`            if elapsed < interval { return Ok(()); }`);
      lines.push(`        }`);
      lines.push(`    }`);
      lines.push(``);
    }

    // Build request with freshness
    lines.push(`    let mut req = SyncRequest {`);
    lines.push(`        method: "GET",`);
    lines.push(`        endpoint: endpoint.clone(),`);
    lines.push(`        paginated: ${paginated},`);
    lines.push(`        etag: None,`);
    lines.push(`        last_modified: None,`);
    lines.push(`    };`);

    if (freshness === "etag") {
      lines.push(`    if let Some(ref etag) = poll.etag { req.etag = Some(etag.clone()); }`);
    } else if (freshness === "last-modified") {
      lines.push(`    if let Some(ref lm) = poll.last_modified { req.last_modified = Some(lm.clone()); }`);
    }
    // "poll-only": no conditional headers

    lines.push(``);
    lines.push(`    let resp = client.rest_call(conn, &req).await?;`);
    lines.push(`    if resp.is_not_modified() { return Ok(()); }`);
    lines.push(``);
    lines.push(`    let items = match resp.body.as_array() {`);
    lines.push(`        Some(a) => a,`);
    lines.push(`        None => return Ok(()),`);
    lines.push(`    };`);
  } else {
    // --- GraphQL transport ---
    lines.push(`    let query = ${snakeCase(sourceModel.name).toUpperCase()}_FIELDS;`);
    lines.push(`    let endpoint = format!("graphql:${tableName}");`);
    lines.push(`    let data = client.graphql_call(conn, &endpoint, query).await?;`);
    lines.push(`    let items = match data.as_array() {`);
    lines.push(`        Some(a) => a,`);
    lines.push(`        None => return Ok(()),`);
    lines.push(`    };`);
  }

  // --- Build upsert args for parent ---
  const upsertArgs: string[] = [];
  for (const f of fields) {
    if (isAutoIncr && f.isPk) continue;
    if (f.isManual) continue;
    if (f.rel) {
      upsertArgs.push(`${snakeCase(f.name)}_id`);
    } else {
      const ident = rustIdent(snakeCase(f.name).replace(/\./g, "_"));
      const base = RUST_TYPE[f.typeName] ?? "String";
      if (base === "String" && !f.nullable) upsertArgs.push(`&fields.${ident}`);
      else if (base === "String" && f.nullable) upsertArgs.push(`fields.${ident}.as_deref()`);
      else upsertArgs.push(`fields.${ident}`);
    }
  }

  const upsertFn = strategy === "insert-ignore" ? `insert_${tableName}` : `upsert_${tableName}`;
  const returnsId = isAutoIncr && strategy === "upsert";

  // --- Item loop ---
  lines.push(``);
  lines.push(`    for item in items {`);
  lines.push(`        let fields = extract_${tableName}(item);`);

  if (returnsId && nestedChildren.length > 0) {
    lines.push(`        let ${tableName}_id = ${upsertFn}(conn, ${upsertArgs.join(", ")}).await?;`);
  } else {
    lines.push(`        ${upsertFn}(conn, ${upsertArgs.join(", ")}).await?;`);
  }

  // --- Nested children ---
  for (const child of nestedChildren) {
    // Convert "commits.nodes[0].commit.foo" into chained Rust JSON access
    // segments: ["commits"], [0], ["commit"], ["foo"]
    const jsonAccess = child.path.split(".").map(seg => {
      const idxMatch = seg.match(/^(\w+)\[(\d+)\]$/);
      if (idxMatch) return `["${idxMatch[1]}"][${idxMatch[2]}]`;
      return `["${seg}"]`;
    }).join("");
    const parentFkField = child.fields.find(f => f.rel?.kind === "belongsTo" && snakeCase(resolveRelTarget(f.rel!)) === tableName);
    const parentIdExpr = parentFkField ? `${tableName}_id` : `/* TODO: parent id */`;

    lines.push(``);
    if (child.strategy === "delete-replace") {
      lines.push(`        sqlx::query("DELETE FROM ${child.tableName} WHERE ${tableName}_id = ?")`);
      lines.push(`            .bind(${parentIdExpr})`);
      lines.push(`            .execute(&mut *conn)`);
      lines.push(`            .await?;`);
    }

    lines.push(`        if let Some(children) = item${jsonAccess}.as_array() {`);
    lines.push(`            for child in children {`);
    lines.push(`                let child_fields = extract_${child.tableName}(child);`);

    // Replace the parent FK arg with the actual parent id
    const childArgs = child.upsertArgs.map(arg => {
      if (parentFkField && arg === `${snakeCase(parentFkField.name)}_id`) return parentIdExpr;
      return arg;
    });

    lines.push(`                ${child.upsertFn}(conn, ${childArgs.join(", ")}).await?;`);
    lines.push(`            }`);
    lines.push(`        }`);
  }

  lines.push(`    }`);

  // --- Poll state persistence ---
  if (!isGql) {
    lines.push(``);
    lines.push(`    client.set_poll_state(conn, &endpoint, &SyncPollState {`);
    if (freshness === "etag") {
      lines.push(`        etag: resp.etag.clone(),`);
      lines.push(`        last_modified: None,`);
    } else if (freshness === "last-modified") {
      lines.push(`        etag: None,`);
      lines.push(`        last_modified: resp.last_modified.clone(),`);
    } else {
      lines.push(`        etag: None,`);
      lines.push(`        last_modified: None,`);
    }
    lines.push(`        poll_interval: ${pollInterval ? `Some(${pollInterval})` : "None"},`);
    lines.push(`        last_polled_at: Some(chrono::Utc::now().to_rfc3339()),`);
    lines.push(`    }).await?;`);
  }

  lines.push(``);
  lines.push(`    Ok(())`);
  lines.push(`}`);
  return lines.join("\n");
}

// ── GraphQL fragment emitter (string) ────────────────────

function emitGraphqlFragment(
  program: Program, sourceModel: Model,
  nestedMap: Map<string, import("./decorators.js").NestedDef>,
  allModels: Model[],
): string {
  const sourceFields: { name: string; typeName: string }[] = [];
  for (const [, prop] of sourceModel.properties) {
    if (prop.type.kind === "Intrinsic" && (prop.type as any).name === "never") continue;
    const { typeName } = resolveFieldType(prop.type);
    sourceFields.push({ name: prop.name, typeName });
  }
  if (sourceFields.length === 0) return "";

  const modelByName = new Map(allModels.map(m => [m.name, m]));

  // Collect @Source.nested children pointing to this source model
  const nestedChildren: { path: string; childModel: Model }[] = [];
  for (const [childName, nestedDef] of nestedMap) {
    if (nestedDef.parent !== sourceModel.name) continue;
    const childModel = modelByName.get(childName);
    if (childModel) nestedChildren.push({ path: nestedDef.path, childModel });
  }

  function emitModelFields(model: Model, indent: string): string[] {
    const out: string[] = [];
    for (const [, prop] of model.properties) {
      if (prop.type.kind === "Intrinsic" && (prop.type as any).name === "never") continue;
      const { typeName } = resolveFieldType(prop.type);
      const sub = modelByName.get(typeName);
      if (sub) {
        out.push(`${indent}${prop.name} {`);
        out.push(...emitModelFields(sub, indent + "    "));
        out.push(`${indent}}`);
      } else {
        out.push(`${indent}${prop.name}`);
      }
    }
    return out;
  }

  const lines: string[] = [];
  lines.push(`/// GraphQL field selection for ${sourceModel.name}`);
  lines.push(`pub const ${snakeCase(sourceModel.name).toUpperCase()}_FIELDS: &str = r#"`);
  lines.push(...emitModelFields(sourceModel, "    "));

  // Append nested sub-selections
  for (const child of nestedChildren) {
    // Path like "reviews.nodes" -> wrap fields in "reviews { nodes { ... } }"
    const pathParts = child.path.split(".");
    // The last segment is usually "nodes" -- the container. Fields go inside it.
    // Intermediate segments are wrapper objects in the GraphQL query.
    let openIndent = "    ";
    for (const part of pathParts) {
      // Strip array indexing for query structure (nodes[0] -> nodes)
      const clean = part.replace(/\[\d+\]/, "");
      lines.push(`${openIndent}${clean} {`);
      openIndent += "    ";
    }
    lines.push(...emitModelFields(child.childModel, openIndent));
    for (let i = pathParts.length - 1; i >= 0; i--) {
      openIndent = openIndent.slice(4);
      lines.push(`${openIndent}}`);
    }
  }

  lines.push(`"#;`);
  return lines.join("\n");
}

// ── Config helpers emitter (string) ──────────────────────

function emitConfigHelpers(program: Program, allModels: Model[]): string {
  const parts: string[] = [];
  for (const model of allModels) {
    if (!isConfigSource(program, model)) continue;
    for (const [, prop] of model.properties) {
      if (prop.type.kind === "Intrinsic" && (prop.type as any).name === "never") continue;
      if (!hasDefault(program, prop)) continue;
      const { typeName } = resolveFieldType(prop.type);
      const val = getDefault(program, prop)!;
      const fn = `default_${snakeCase(model.name)}_${snakeCase(prop.name)}`;
      const base = RUST_TYPE[typeName] ?? "String";
      let body: string;
      if (base === "String") body = `"${val}".to_owned()`;
      else if (base === "bool") body = val === "true" ? "true" : "false";
      else body = val;
      parts.push(`fn ${fn}() -> ${rustType(typeName, false)} { ${body} }`);
    }
    const configPath = hasConfigPath(program, model) ? getConfigPath(program, model) : undefined;
    if (configPath) {
      parts.push(``, `impl ${model.name} {`);
      parts.push(`    pub fn load() -> Result<Self> {`);
      parts.push(`        let path = shellexpand::tilde("${configPath}").to_string();`);
      parts.push(`        let contents = std::fs::read_to_string(&path)?;`);
      parts.push(`        let config: Self = toml::from_str(&contents)?;`);
      parts.push(`        Ok(config)`, `    }`, `}`);
    }
  }
  return parts.join("\n");
}

// ── Config/CLI merge emitter (string) ────────────────────

function emitConfigCliMerge(program: Program, allModels: Model[]): string {
  const parts: string[] = [];
  for (const model of allModels) {
    if (!isConfigSource(program, model)) continue;
    const cliModel = allModels.find(m => isCliCommand(program, m) && m.name === model.name);
    if (!cliModel) continue;

    parts.push(`impl ${model.name} {`);
    parts.push(`    /// Apply CLI overrides. CLI values take precedence over config file.`);
    parts.push(`    pub fn with_cli(mut self, cli: &${model.name}Cli) -> Self {`);
    for (const [, prop] of model.properties) {
      if (prop.type.kind === "Intrinsic" && (prop.type as any).name === "never") continue;
      const isFlag = isCliFlag(program, prop);
      const isArg = hasCliArg(program, prop);
      if (!isFlag && !isArg) continue;
      const { typeName, nullable } = resolveFieldType(prop.type);
      const ident = rustIdent(snakeCase(prop.name));
      const base = RUST_TYPE[typeName] ?? "String";
      if (nullable) parts.push(`        if cli.${ident}.is_some() { self.${ident} = cli.${ident}.clone(); }`);
      else if (base === "String") parts.push(`        self.${ident} = cli.${ident}.clone();`);
      else parts.push(`        self.${ident} = cli.${ident};`);
    }
    parts.push(`        self`, `    }`);

    parts.push(``, `    /// Apply environment variable overrides.`);
    parts.push(`    pub fn with_env(mut self) -> Self {`);
    for (const [, prop] of model.properties) {
      if (prop.type.kind === "Intrinsic" && (prop.type as any).name === "never") continue;
      if (!hasConfigEnv(program, prop)) continue;
      const envName = getConfigEnv(program, prop);
      const { typeName } = resolveFieldType(prop.type);
      const ident = rustIdent(snakeCase(prop.name));
      const base = RUST_TYPE[typeName] ?? "String";
      parts.push(`        if let Ok(val) = std::env::var("${envName}") {`);
      if (base === "String") parts.push(`            self.${ident} = val;`);
      else if (base === "bool") parts.push(`            self.${ident} = val == "true" || val == "1";`);
      else if (base === "i64") parts.push(`            if let Ok(n) = val.parse() { self.${ident} = n; }`);
      else parts.push(`            self.${ident} = val;`);
      parts.push(`        }`);
    }
    parts.push(`        self`, `    }`, `}`);
  }
  return parts.join("\n");
}

// ── Http router emitter (string) ─────────────────────────

function emitHttpRouter(program: Program, allModels: Model[]): string {
  const parts: string[] = [];
  for (const model of allModels) {
    if (!isHttpRouter(program, model)) continue;
    const routes = getHttpRoutes(program, model.name) ?? [];
    if (routes.length === 0) continue;
    const stateType = getHttpState(program, model.name) ?? "()";
    parts.push(`pub fn ${snakeCase(model.name)}() -> Router<${stateType}> {`);
    parts.push(`    Router::new()`);
    for (const route of routes) {
      const handler = route.path.replace(/^\//, "").replace(/\/:(\w+)/g, "_by_$1").replace(/\//g, "_").replace(/-/g, "_");
      parts.push(`        .route("${route.path}", ${route.method}(${handler}))`);
    }
    parts.push(`}`);
    for (const route of routes) {
      const handler = route.path.replace(/^\//, "").replace(/\/:(\w+)/g, "_by_$1").replace(/\//g, "_").replace(/-/g, "_");
      parts.push(``, `async fn ${handler}(`);
      if (stateType !== "()") parts.push(`    State(config): State<${stateType}>,`);
      parts.push(`) -> impl IntoResponse {`);
      parts.push(`    todo!("implement ${route.method.toUpperCase()} ${route.path}")`);
      parts.push(`}`);
    }
  }
  return parts.join("\n");
}

// ── Main entry point ──────────────────────────────────────

const BASE_USES = [
  "anyhow::Result",
  "serde::{Deserialize, Serialize}",
  "sqlx::SqliteConnection",
];

export function emitRust(program: Program, existingFile?: string): OutputDirectory {
  const interned = internStorage(program);
  const internFile = interned.entities.length ? internAutoFile(program, interned, emitInternRust(interned, rustType, rustIdent), existingFile) : undefined;
  const allModels = collectModels(program.getGlobalNamespaceType());
  const relMap = getAllRelations(program);
  const entities = allModels.filter(m => isEntityModel(program, m) && !interned.entities.some(e => e.model === m));
  const bindings = allModels.filter(m => hasBinding(program, m));
  const fieldsByEntity = new Map(entities.map(m => [m.name, resolvedFields(program, m, relMap)]));

  const hasCliModels = allModels.some(m => isCliCommand(program, m));
  const hasHttpModels = allModels.some(m => isHttpRouter(program, m));
  const hasConfigModels = allModels.some(m => isConfigSource(program, m));

  const uses = [...BASE_USES];
  if (hasCliModels) uses.push("clap::{Parser, Subcommand}");
  if (hasHttpModels) uses.push("axum::{Router, routing::get, routing::post, response::IntoResponse}");

  // Sync pipeline imports added after syncSections are computed below

  const upsertSections = entities.map(m => emitUpsertFn(program, fieldsByEntity.get(m.name)!, m.name)).filter(Boolean);
  const extractSections = bindings.map(m => emitExtractFn(program, m, relMap)).filter(Boolean);

  // GraphQL sources
  const gqlSources = allModels.filter(m => isSourceGraphql(program, m));
  const nestedMap = getAllSourceNested(program);
  const gqlSections = gqlSources.map(m => emitGraphqlFragment(program, m, nestedMap, allModels)).filter(Boolean);

  // Sync pipelines
  const syncEntities = entities.filter(m => {
    for (const b of bindings) {
      const binding = getBinding(program, b)!;
      if (binding.targetModel.name === m.name) return true;
    }
    return false;
  });
  const syncSections = syncEntities.map(m => emitSyncFn(program, m, relMap, allModels, nestedMap)).filter(Boolean);
  const hasSyncFns = syncSections.length > 0;
  if (hasSyncFns) uses.push("async_trait::async_trait");

  const configHelpers = emitConfigHelpers(program, allModels);
  const mergeSections = emitConfigCliMerge(program, allModels);
  const httpSections = emitHttpRouter(program, allModels);

  // CLI parent->children map
  const childrenOf = new Map<string, string[]>();
  for (const m of allModels) {
    if (!isCliCommand(program, m)) continue;
    const sub = getCliSubcommand(program, m.name);
    if (sub) {
      if (!childrenOf.has(sub.parent)) childrenOf.set(sub.parent, []);
      childrenOf.get(sub.parent)!.push(m.name);
    }
  }

  const tree = (
    <Output>
      <VisibilityContext.Provider value="pub">
        <CrateDirectory>
          {internFile !== undefined && <SourceFile path="intern_auto.rs" filetype="rust">{internFile}</SourceFile>}
          <ReplaceFile path="generated.rs" existingFile={existingFile}>

            <AutoZone id="imports">
              {uses.map(u => `use ${u};\n`).join("")}
              {interned.entities.length > 0 && "pub mod intern_auto;\npub use intern_auto::*;\n"}
            </AutoZone>

            <AutoZone id="row-structs">
              {entities.map((model, i) => {
                const fields = fieldsByEntity.get(model.name)!;
                return <>
                  {i > 0 && "\n\n"}
                  <StructDeclaration name={model.name} derive={["Debug", "Clone", "Serialize", "Deserialize"]}>
                    <List hardline>
                      {fields.map(f => <StructField name={rowName(f)} type={rowType(f)} />)}
                    </List>
                  </StructDeclaration>
                </>;
              })}
            </AutoZone>

            <AutoZone id="extraction-structs">
              {bindings.map((bindingModel, i) => {
                const binding = getBinding(program, bindingModel)!;
                const fields = fieldsByEntity.get(binding.targetModel.name);
                if (!fields) return null;
                const pks = fields.filter(f => f.isPk).map(f => f.name);
                const isAutoIncr = pks.length === 1 && fields.find(f => f.name === pks[0])?.typeName === "integer";
                const extractable = fields.filter(f => !f.rel && !f.isManual && !(isAutoIncr && f.isPk));
                if (extractable.length === 0) return null;
                return <>
                  {i > 0 && "\n\n"}
                  <StructDeclaration name={`${binding.targetModel.name}Fields`}>
                    <List hardline>
                      {extractable.map(f => (
                        <StructField name={rustIdent(snakeCase(f.name).replace(/\./g, "_"))} type={rustType(f.typeName, f.nullable)} />
                      ))}
                    </List>
                  </StructDeclaration>
                </>;
              })}
            </AutoZone>

            <AutoZone id="upsert-fns">
              {upsertSections.join("\n\n")}
            </AutoZone>

            <AutoZone id="extract-fns">
              {extractSections.join("\n\n")}
            </AutoZone>

            {gqlSections.length > 0 && (
              <AutoZone id="graphql-fragments">{gqlSections.join("\n\n")}</AutoZone>
            )}

            {hasSyncFns && (
              <AutoZone id="sync-trait">{emitSyncTrait()}</AutoZone>
            )}

            {hasSyncFns && (
              <AutoZone id="sync-pipelines">{syncSections.join("\n\n")}</AutoZone>
            )}

            {hasConfigModels && (
              <AutoZone id="config">
                {allModels.filter(m => isConfigSource(program, m)).map(model => {
                  const configFields: { ident: string; ty: string; attrs: string[] }[] = [];
                  for (const [, prop] of model.properties) {
                    if (prop.type.kind === "Intrinsic" && (prop.type as any).name === "never") continue;
                    const { typeName, nullable } = resolveFieldType(prop.type);
                    const ident = rustIdent(snakeCase(prop.name));
                    const fieldAttrs: string[] = [];
                    if (isConfigSecret(program, prop)) fieldAttrs.push("serde(skip_serializing)");
                    if (hasDefault(program, prop)) {
                      fieldAttrs.push(`serde(default = "${`default_${snakeCase(model.name)}_${snakeCase(prop.name)}`}")`);
                    }
                    configFields.push({ ident, ty: rustType(typeName, nullable), attrs: fieldAttrs });
                  }
                  return (
                    <StructDeclaration name={model.name} derive={["Debug", "Clone", "Serialize", "Deserialize"]} serde={{ default: true }}>
                      <List hardline>
                        {configFields.map(f => (
                          <StructField name={f.ident} type={f.ty} attrs={f.attrs.length > 0 ? f.attrs : undefined} />
                        ))}
                      </List>
                    </StructDeclaration>
                  );
                })}
                {"\n"}{configHelpers}
              </AutoZone>
            )}

            {hasCliModels && (
              <AutoZone id="cli">
                {allModels.filter(m => isCliCommand(program, m)).map(model => {
                  const children = childrenOf.get(model.name) ?? [];
                  const cmdAttrs: string[] = [];
                  if (hasCliAbout(program, model)) cmdAttrs.push(`command(about = "${getCliAbout(program, model)}")`);

                  const cliFields: string[] = [];
                  for (const [, prop] of model.properties) {
                    if (prop.type.kind === "Intrinsic" && (prop.type as any).name === "never") continue;
                    const isFlagField = isCliFlag(program, prop);
                    const isArgField = hasCliArg(program, prop);
                    if (!isFlagField && !isArgField) continue;
                    const { typeName, nullable } = resolveFieldType(prop.type);

                    const attrs: string[] = [];
                    if (isArgField) attrs.push(`index = ${getCliArg(program, prop)}`);
                    else attrs.push("long");
                    if (hasCliShort(program, prop)) attrs.push(`short = '${getCliShort(program, prop)}'`);
                    if (hasConfigEnv(program, prop)) attrs.push(`env = "${getConfigEnv(program, prop)}"`);
                    if (hasDefault(program, prop)) attrs.push(`default_value = "${getDefault(program, prop)}"`);
                    if (hasCliAbout(program, prop)) attrs.push(`help = "${getCliAbout(program, prop)}"`);

                    const ident = rustIdent(snakeCase(prop.name));
                    const ty = rustType(typeName, nullable);
                    cliFields.push(`\n    #[arg(${attrs.join(", ")})]\n    pub ${ident}: ${ty},`);
                  }

                  return <>
                    {"\n"}
                    <StructDeclaration name={`${model.name}Cli`} derive={["Debug", "Clone", "Parser"]} attrs={cmdAttrs.length > 0 ? cmdAttrs : undefined}>
                      {cliFields.join("")}
                      {children.length > 0 && `\n    #[command(subcommand)]\n    pub command: ${model.name}Subcommand,`}
                    </StructDeclaration>
                    {children.length > 0 && <>
                      {"\n\n"}
                      <EnumDeclaration name={`${model.name}Subcommand`} derive={["Debug", "Clone", "Subcommand"]}>
                        <List hardline>
                          {children.map(child => {
                            const childModel = allModels.find(m => m.name === child && isCliCommand(program, m));
                            const about = childModel && hasCliAbout(program, childModel) ? getCliAbout(program, childModel) : undefined;
                            return <>
                              {about && `/// ${about}\n`}
                              <TupleVariant name={child} fields={[`${child}Cli`]} />
                            </>;
                          })}
                        </List>
                      </EnumDeclaration>
                    </>}
                  </>;
                })}
              </AutoZone>
            )}

            {mergeSections && (
              <AutoZone id="config-cli-merge">{mergeSections}</AutoZone>
            )}

            {httpSections && (
              <AutoZone id="http-routes">{httpSections}</AutoZone>
            )}

            <ManualZone>
              {"// Custom code below this line is preserved across re-generation.\n"}
            </ManualZone>

          </ReplaceFile>
        </CrateDirectory>
      </VisibilityContext.Provider>
    </Output>
  );

  return render(tree);
}
