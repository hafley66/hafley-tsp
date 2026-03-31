// Rust emitter -- consumes FactDB, produces generated.rs via alloy-rs JSX.
// Uses ReplaceFile + AutoZone for re-emit-safe codegen.

import { Output, render, List, type OutputDirectory, type OutputFile } from "@alloy-js/core";
import {
  StructDeclaration,
  StructField,
  EnumDeclaration,
  TupleVariant,
  ReplaceFile,
  AutoZone,
  ManualZone,
  CrateDirectory,
  VisibilityContext,
} from "@hafley/alloy-rs";

import type { FactDB, FieldFact, RelationFact, ConfigFieldFact, CliFieldFact } from "./2_facts.js";

// ── Type mapping ──────────────────────────────────────────

const RUST_TYPE: Record<string, string> = {
  string: "String",
  integer: "i64",
  int8: "i8", int16: "i16", int32: "i32", int64: "i64",
  uint8: "u8", uint16: "u16", uint32: "u32", uint64: "u64",
  float: "f64", float32: "f32", float64: "f64",
  boolean: "bool",
  bytes: "Vec<u8>",
};

function rustType(tspType: string, nullable: boolean): string {
  const base = RUST_TYPE[tspType] ?? "String";
  return nullable ? `Option<${base}>` : base;
}

function snakeCase(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/\./g, "_").toLowerCase();
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

function rustIdent(name: string): string {
  return RUST_RESERVED.has(name) ? `r#${name}` : name;
}

function sqlColName(field: FieldFact, rels: Map<string, RelationFact>): string {
  const rel = rels.get(`${field.entity}.${field.name}`);
  return rel ? `${snakeCase(field.name)}_id` : snakeCase(field.name);
}

// ── Lookup builders ───────────────────────────────────────

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
  const sourceByModel = new Map<string, (typeof db.sources)[0]>();
  for (const s of db.sources) sourceByModel.set(s.model, s);
  const nestedByModel = new Map<string, (typeof db.source_nested)[0]>();
  for (const n of db.source_nested) nestedByModel.set(n.model, n);

  return {
    pksByEntity, relsByKey, defaultsByKey, uniquesByEntity, manualFields,
    syncStrategyByEntity, bindingByTarget, bindingByName, sourceByModel, nestedByModel,
  };
}

type Lookups = ReturnType<typeof buildLookups>;

// ── Row struct field helpers ──────────────────────────────

function rowFieldName(f: FieldFact, rels: Map<string, RelationFact>): string {
  const col = snakeCase(f.name).replace(/\./g, "_");
  const rel = rels.get(`${f.entity}.${f.name}`);
  return rustIdent(rel ? `${col}_id` : col);
}

function rowFieldType(f: FieldFact, rels: Map<string, RelationFact>): string {
  const rel = rels.get(`${f.entity}.${f.name}`);
  return rel ? (f.nullable ? "Option<i64>" : "i64") : rustType(f.type, f.nullable);
}

// ── Upsert function emitter (string) ─────────────────────

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
  const placeholders = upsertFields.map(() => "?").join(", ");
  const fnName = strategy === "insert-ignore" ? `insert_${tableName}` : `upsert_${tableName}`;

  const params = upsertFields.map(f => {
    const rel = relsByKey.get(`${entityName}.${f.name}`);
    const paramName = rustIdent(rel ? `${snakeCase(f.name)}_id` : snakeCase(f.name).replace(/\./g, "_"));
    const ty = rel ? (f.nullable ? "Option<i64>" : "i64") : rustType(f.type, f.nullable);
    const paramTy = ty === "String" ? "&str" : ty === "Option<String>" ? "Option<&str>" : ty;
    return `${paramName}: ${paramTy}`;
  });

  const returnsId = isAutoIncrPk && strategy === "upsert";
  const lines: string[] = [];

  lines.push(`pub async fn ${fnName}(`);
  lines.push(`    conn: &mut SqliteConnection,`);
  for (const p of params) lines.push(`    ${p},`);
  lines.push(`) -> Result<${returnsId ? "i64" : "()"}> {`);

  if (strategy === "insert-ignore" || strategy === "delete-replace") {
    lines.push(`    sqlx::query(`);
    lines.push(`        "INSERT OR IGNORE INTO ${tableName}`);
    lines.push(`         (${colNames.join(", ")})`);
    lines.push(`         VALUES (${placeholders})"`);
    lines.push(`    )`);
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

    if (returnsId) lines.push(`    let id: i64 = sqlx::query_scalar(`);
    else lines.push(`    sqlx::query(`);

    lines.push(`        "INSERT INTO ${tableName}`);
    lines.push(`         (${colNames.join(", ")})`);
    lines.push(`         VALUES (${placeholders})`);
    if (conflictCols.length > 0 && updateCols.length > 0) {
      lines.push(`         ON CONFLICT(${conflictCols.join(", ")}) DO UPDATE SET`);
      lines.push(`             ${updateCols.map(c => `${c} = excluded.${c}`).join(",\n             ")}`);
    } else if (conflictCols.length > 0) {
      lines.push(`         ON CONFLICT(${conflictCols.join(", ")}) DO NOTHING`);
    }
    if (returnsId) lines.push(`         RETURNING id"`);
    else lines.push(`        "`);
    lines.push(`    )`);
  }

  for (const f of upsertFields) {
    const rel = relsByKey.get(`${entityName}.${f.name}`);
    const paramName = rustIdent(rel ? `${snakeCase(f.name)}_id` : snakeCase(f.name).replace(/\./g, "_"));
    lines.push(`    .bind(${paramName})`);
  }

  if (strategy === "upsert" && returnsId) {
    lines.push(`    .fetch_one(conn)`, `    .await?;`, `    Ok(id)`);
  } else {
    lines.push(`    .execute(conn)`, `    .await?;`, `    Ok(())`);
  }
  lines.push(`}`);
  return lines.join("\n");
}

// ── JSON extraction emitter (string) ─────────────────────

function emitJsonAccess(expr: string, field: FieldFact): string {
  const base = RUST_TYPE[field.type] ?? "String";
  if (base === "String") {
    return field.nullable ? `${expr}.as_str().map(|s| s.to_owned())` : `${expr}.as_str().unwrap_or("").to_owned()`;
  }
  if (base === "i64") return field.nullable ? `${expr}.as_i64()` : `${expr}.as_i64().unwrap_or(0)`;
  if (base === "bool") return field.nullable ? `${expr}.as_bool()` : `${expr}.as_bool().unwrap_or(false)`;
  if (base === "f64") return field.nullable ? `${expr}.as_f64()` : `${expr}.as_f64().unwrap_or(0.0)`;
  return field.nullable ? `${expr}.as_str().map(|s| s.to_owned())` : `${expr}.as_str().unwrap_or("").to_owned()`;
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

  const fnName = `extract_${snakeCase(info.target)}`;
  const fieldMapByTarget = new Map<string, string[]>();
  for (const fm of fieldMaps) fieldMapByTarget.set(fm.target_field, fm.source_chain);
  const autoMapSet = new Set(autoMaps.map(am => am.field));

  const lines: string[] = [];
  lines.push(`/// Extract ${info.target} fields from a ${info.source} JSON value.`);
  lines.push(`pub fn ${fnName}(src: &serde_json::Value) -> ${info.target}Fields {`);

  const boundFields: { field: FieldFact; ident: string }[] = [];
  for (const field of entityFields) {
    if (relsByKey.get(`${info.target}.${field.name}`)) continue;
    if (manuals.has(field.name)) continue;
    if (isAutoIncrPk && pks.includes(field.name)) continue;

    const col = snakeCase(field.name).replace(/\./g, "_");
    const ident = rustIdent(col);
    const chain = fieldMapByTarget.get(field.name);

    if (chain) {
      const jsonPath = chain.map(link => { const dot = link.indexOf("."); return dot >= 0 ? link.substring(dot + 1) : link; });
      const accessor = jsonPath.map(p => `["${p}"]`).join("");
      lines.push(`    let ${ident} = ${emitJsonAccess(`src${accessor}`, field)};`);
      boundFields.push({ field, ident });
    } else if (field.is_dot_path) {
      const parts = field.name.split(".");
      const accessor = parts.map(p => `["${p}"]`).join("");
      lines.push(`    let ${ident} = ${emitJsonAccess(`src${accessor}`, field)};`);
      boundFields.push({ field, ident });
    } else if (autoMapSet.has(field.name)) {
      lines.push(`    let ${ident} = ${emitJsonAccess(`src["${field.name}"]`, field)};`);
      boundFields.push({ field, ident });
    }
  }

  lines.push(`    ${info.target}Fields {`);
  for (const { ident } of boundFields) lines.push(`        ${ident},`);
  lines.push(`    }`, `}`);
  return lines.join("\n");
}

// ── Sync pipeline emitter (string) ───────────────────────

function emitSyncFn(entityName: string, db: FactDB, lookups: Lookups): string {
  const { bindingByTarget, bindingByName, sourceByModel, relsByKey, syncStrategyByEntity } = lookups;
  const bindingName = bindingByTarget.get(entityName);
  if (!bindingName) return "";
  const binding = bindingByName.get(bindingName)!;
  const source = sourceByModel.get(binding.source);
  if (!source) return "";

  const tableName = snakeCase(entityName);
  const fnName = `sync_${tableName}`;
  const strategy = syncStrategyByEntity.get(entityName) ?? "upsert";
  const entityFields = db.fields.filter(f => f.entity === entityName);
  const parentRel = entityFields.find(f => {
    const rel = relsByKey.get(`${entityName}.${f.name}`);
    return rel && rel.kind === "belongsTo";
  });
  const parentRelDef = parentRel ? relsByKey.get(`${entityName}.${parentRel.name}`) : undefined;

  const lines: string[] = [];
  lines.push(`pub async fn ${fnName}(`);
  lines.push(`    conn: &mut SqliteConnection,`);
  lines.push(`    gh: &dyn GitHubClient,`);
  if (parentRelDef) lines.push(`    ${snakeCase(parentRel!.name)}_id: i64,`);
  if (source.transport === "rest" && source.endpoint?.includes("{owner}")) {
    lines.push(`    owner: &str,`, `    name: &str,`);
  }
  lines.push(`) -> Result<()> {`);

  if (source.transport === "rest") {
    const endpoint = source.endpoint ?? `/${tableName}`;
    const endpointExpr = endpoint.includes("{owner}")
      ? `format!("${endpoint.replace(/\{owner\}/g, "{owner}").replace(/\{name\}/g, "{name}")}")`
      : `"${endpoint}".to_owned()`;
    lines.push(`    let endpoint = ${endpointExpr};`);
    lines.push(`    let poll = db::get_poll_state(conn, &endpoint).await?;`, ``);
    if (source.poll_interval) {
      lines.push(`    if let (Some(interval), Some(ref last_polled)) = (poll.poll_interval, &poll.last_polled_at) {`);
      lines.push(`        if let Ok(last) = chrono::DateTime::parse_from_rfc3339(last_polled) {`);
      lines.push(`            let elapsed = chrono::Utc::now().signed_duration_since(last).num_seconds();`);
      lines.push(`            if elapsed < interval { return Ok(()); }`);
      lines.push(`        }`, `    }`, ``);
    }
    lines.push(`    let mut req = GhRequest::get(&endpoint)${source.paginated ? ".paginated()" : ""};`);
    lines.push(`    if let Some(ref etag) = poll.etag { req = req.with_etag(etag); }`, ``);
    lines.push(`    let resp = gh.call(conn, &req).await?;`);
    lines.push(`    if resp.is_not_modified() { return Ok(()); }`, ``);
    lines.push(`    let items = match resp.body.as_array() {`);
    lines.push(`        Some(a) => a,`, `        None => return Ok(()),`, `    };`);
  } else {
    lines.push(`    gh.throttle_if_needed(conn, "graphql").await?;`);
    lines.push(`    let items: &Vec<serde_json::Value> = todo!("wire up GraphQL query");`);
  }

  const entityPks = lookups.pksByEntity.get(entityName) ?? [];
  const isAutoIncrPk = entityPks.length === 1 && entityFields.find(f => f.name === entityPks[0])?.type === "integer";
  const upsertArgs: string[] = [];
  for (const f of entityFields) {
    if (isAutoIncrPk && entityPks.includes(f.name)) continue;
    if (lookups.manualFields.has(`${entityName}.${f.name}`)) continue;
    const rel = relsByKey.get(`${entityName}.${f.name}`);
    if (rel) {
      upsertArgs.push(`${snakeCase(f.name)}_id`);
    } else {
      const col = snakeCase(f.name).replace(/\./g, "_");
      const ident = rustIdent(col);
      const base = RUST_TYPE[f.type] ?? "String";
      if (base === "String" && !f.nullable) upsertArgs.push(`&fields.${ident}`);
      else if (base === "String" && f.nullable) upsertArgs.push(`fields.${ident}.as_deref()`);
      else upsertArgs.push(`fields.${ident}`);
    }
  }

  const upsertFnName = strategy === "insert-ignore" ? `insert_${tableName}` : `upsert_${tableName}`;
  lines.push(``, `    for item in items {`);
  lines.push(`        let fields = extract_${tableName}(item);`);
  lines.push(`        ${upsertFnName}(conn, ${upsertArgs.join(", ")}).await?;`);
  lines.push(`    }`, ``, `    Ok(())`, `}`);
  return lines.join("\n");
}

// ── GraphQL fragment emitter (string) ────────────────────

function emitGraphqlFragment(sourceModelName: string, db: FactDB): string {
  const fields = db.source_fields.filter(f => f.model === sourceModelName);
  if (fields.length === 0) return "";

  const lines: string[] = [];
  lines.push(`/// GraphQL field selection for ${sourceModelName}`);
  lines.push(`pub const ${snakeCase(sourceModelName).toUpperCase()}_FIELDS: &str = r#"`);
  for (const f of fields) {
    const nestedFields = db.source_fields.filter(sf => sf.model === f.type);
    if (nestedFields.length > 0) {
      lines.push(`    ${f.name} {`);
      for (const nf of nestedFields) {
        const deep = db.source_fields.filter(sf => sf.model === nf.type);
        if (deep.length > 0) lines.push(`        ${nf.name} { ${deep.map(d => d.name).join(" ")} }`);
        else lines.push(`        ${nf.name}`);
      }
      lines.push(`    }`);
    } else {
      lines.push(`    ${f.name}`);
    }
  }
  lines.push(`"#;`);
  return lines.join("\n");
}

// ── Config default fns + load impl (string) ──────────────

function emitConfigHelpers(db: FactDB): string {
  const parts: string[] = [];
  for (const cfg of db.config_models) {
    const fields = db.config_fields.filter(f => f.model === cfg.model);
    for (const f of fields) {
      if (f.default === undefined) continue;
      const defaultFn = `default_${snakeCase(cfg.model)}_${snakeCase(f.name)}`;
      const base = RUST_TYPE[f.type] ?? "String";
      let body: string;
      if (base === "String") body = `"${f.default}".to_owned()`;
      else if (base === "bool") body = f.default === "true" ? "true" : "false";
      else body = f.default;
      parts.push(`fn ${defaultFn}() -> ${rustType(f.type, false)} { ${body} }`);
    }
    if (cfg.path) {
      parts.push(``);
      parts.push(`impl ${cfg.model} {`);
      parts.push(`    pub fn load() -> Result<Self> {`);
      parts.push(`        let path = shellexpand::tilde("${cfg.path}").to_string();`);
      parts.push(`        let contents = std::fs::read_to_string(&path)?;`);
      parts.push(`        let config: Self = toml::from_str(&contents)?;`);
      parts.push(`        Ok(config)`);
      parts.push(`    }`, `}`);
    }
  }
  return parts.join("\n");
}

// ── Config/CLI merge emitter (string) ────────────────────

function emitConfigCliMerge(db: FactDB): string {
  const parts: string[] = [];
  for (const cfg of db.config_models) {
    const configFields = db.config_fields.filter(f => f.model === cfg.model);
    const cliFields = db.cli_fields.filter(f => f.model === cfg.model);
    if (cliFields.length === 0) continue;
    const cliCmd = db.cli_commands.find(c => c.model === cfg.model);
    if (!cliCmd) continue;

    parts.push(`impl ${cfg.model} {`);
    parts.push(`    /// Apply CLI overrides. CLI values take precedence over config file.`);
    parts.push(`    pub fn with_cli(mut self, cli: &${cfg.model}Cli) -> Self {`);
    for (const cf of configFields) {
      const cliField = cliFields.find(clf => clf.name === cf.name);
      if (!cliField) continue;
      const ident = rustIdent(snakeCase(cf.name));
      const base = RUST_TYPE[cf.type] ?? "String";
      if (cf.nullable) parts.push(`        if cli.${ident}.is_some() { self.${ident} = cli.${ident}.clone(); }`);
      else if (base === "String") parts.push(`        self.${ident} = cli.${ident}.clone();`);
      else parts.push(`        self.${ident} = cli.${ident};`);
    }
    parts.push(`        self`, `    }`);

    parts.push(``, `    /// Apply environment variable overrides.`);
    parts.push(`    pub fn with_env(mut self) -> Self {`);
    for (const cf of configFields) {
      if (!cf.env) continue;
      const ident = rustIdent(snakeCase(cf.name));
      const base = RUST_TYPE[cf.type] ?? "String";
      parts.push(`        if let Ok(val) = std::env::var("${cf.env}") {`);
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

function emitHttpRouter(db: FactDB): string {
  const parts: string[] = [];
  for (const router of db.http_routers) {
    const routes = db.http_routes.filter(r => r.router === router.model);
    if (routes.length === 0) continue;
    const stateType = router.state_model ?? "()";
    parts.push(`pub fn ${snakeCase(router.model)}() -> Router<${stateType}> {`);
    parts.push(`    Router::new()`);
    for (const route of routes) parts.push(`        .route("${route.path}", ${route.method}(${route.handler}))`);
    parts.push(`}`);
    for (const route of routes) {
      parts.push(``, `async fn ${route.handler}(`);
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

export function emitRust(db: FactDB, existingFile?: string): string {
  const lookups = buildLookups(db);

  // Collect conditional external uses
  const uses = [...BASE_USES];
  if (db.cli_commands.length > 0) uses.push("clap::{Parser, Subcommand}");
  if (db.http_routers.length > 0) uses.push("axum::{Router, routing::get, routing::post, response::IntoResponse}");

  // Build section strings for non-JSX parts
  const upsertSections = db.entities
    .map(e => emitUpsertFn(e.name, db.fields.filter(f => f.entity === e.name), lookups))
    .filter(Boolean);

  const extractSections = db.bindings
    .map(b => emitExtractFn(b.name, db, lookups))
    .filter(Boolean);

  const gqlSources = db.sources.filter(s => s.transport === "graphql");
  const gqlSections = gqlSources.map(s => emitGraphqlFragment(s.model, db)).filter(Boolean);

  const syncEntities = db.entities.filter(e => lookups.bindingByTarget.has(e.name));
  const syncSections = syncEntities.map(e => emitSyncFn(e.name, db, lookups)).filter(Boolean);

  const configHelpers = emitConfigHelpers(db);
  const mergeSections = emitConfigCliMerge(db);
  const httpSections = emitHttpRouter(db);

  // Build CLI parent->children map
  const childrenOf = new Map<string, string[]>();
  for (const cmd of db.cli_commands) {
    if (cmd.parent) {
      if (!childrenOf.has(cmd.parent)) childrenOf.set(cmd.parent, []);
      childrenOf.get(cmd.parent)!.push(cmd.model);
    }
  }

  const tree = (
    <Output>
      <VisibilityContext.Provider value="pub">
        <CrateDirectory>
          <ReplaceFile path="generated.rs" existingFile={existingFile}>

            {/* ── Imports ── */}
            <AutoZone id="imports">
              {uses.map(u => `use ${u};\n`).join("")}
            </AutoZone>

            {/* ── Row structs ── */}
            <AutoZone id="row-structs">
              {db.entities.map((e, i) => {
                const fields = db.fields.filter(f => f.entity === e.name);
                return <>
                  {i > 0 && "\n\n"}
                  <StructDeclaration name={e.name} derive={["Debug", "Clone", "Serialize", "Deserialize"]}>
                    <List hardline>
                      {fields.map(f => (
                        <StructField name={rowFieldName(f, lookups.relsByKey)} type={rowFieldType(f, lookups.relsByKey)} />
                      ))}
                    </List>
                  </StructDeclaration>
                </>;
              })}
            </AutoZone>

            {/* ── Extraction structs ── */}
            <AutoZone id="extraction-structs">
              {db.bindings.map((binding, i) => {
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
                  {i > 0 && "\n\n"}
                  <StructDeclaration name={`${binding.target}Fields`}>
                    <List hardline>
                      {extractable.map(f => {
                        const col = rustIdent(snakeCase(f.name).replace(/\./g, "_"));
                        return <StructField name={col} type={rustType(f.type, f.nullable)} />;
                      })}
                    </List>
                  </StructDeclaration>
                </>;
              })}
            </AutoZone>

            {/* ── Upsert functions ── */}
            <AutoZone id="upsert-fns">
              {upsertSections.join("\n\n")}
            </AutoZone>

            {/* ── JSON extraction ── */}
            <AutoZone id="extract-fns">
              {extractSections.join("\n\n")}
            </AutoZone>

            {/* ── GraphQL fragments ── */}
            {gqlSections.length > 0 && (
              <AutoZone id="graphql-fragments">
                {gqlSections.join("\n\n")}
              </AutoZone>
            )}

            {/* ── Sync pipelines ── */}
            {syncSections.length > 0 && (
              <AutoZone id="sync-pipelines">
                {syncSections.join("\n\n")}
              </AutoZone>
            )}

            {/* ── Config structs ── */}
            {db.config_models.length > 0 && (
              <AutoZone id="config">
                {db.config_models.map(cfg => {
                  const fields = db.config_fields.filter(f => f.model === cfg.model);
                  return (
                    <StructDeclaration name={cfg.model} derive={["Debug", "Clone", "Serialize", "Deserialize"]} serde={{ default: true }}>
                      <List hardline>
                        {fields.map(f => {
                          const ident = rustIdent(snakeCase(f.name));
                          const fieldAttrs: string[] = [];
                          if (f.secret) fieldAttrs.push("serde(skip_serializing)");
                          if (f.default !== undefined) {
                            fieldAttrs.push(`serde(default = "${`default_${snakeCase(cfg.model)}_${snakeCase(f.name)}`}")`);
                          }
                          return <StructField name={ident} type={rustType(f.type, f.nullable)} attrs={fieldAttrs.length > 0 ? fieldAttrs : undefined} />;
                        })}
                      </List>
                    </StructDeclaration>
                  );
                })}
                {"\n"}{configHelpers}
              </AutoZone>
            )}

            {/* ── CLI structs ── */}
            {db.cli_commands.length > 0 && (
              <AutoZone id="cli">
                {db.cli_commands.map(cmd => {
                  const fields = db.cli_fields.filter(f => f.model === cmd.model);
                  const children = childrenOf.get(cmd.model) ?? [];
                  const cmdAttrs: string[] = [];
                  if (cmd.about) cmdAttrs.push(`command(about = "${cmd.about}")`);

                  return <>
                    {"\n"}
                    <StructDeclaration name={`${cmd.model}Cli`} derive={["Debug", "Clone", "Parser"]} attrs={cmdAttrs.length > 0 ? cmdAttrs : undefined}>
                      {fields.map(f => {
                        const attrs: string[] = [];
                        if (f.kind === "arg") {
                          const posStr = typeof f.position === "number" ? f.position.toString() : "0";
                          attrs.push(`index = ${posStr}`);
                        } else {
                          attrs.push("long");
                        }
                        if (f.short) attrs.push(`short = '${f.short}'`);
                        if (f.env) attrs.push(`env = "${f.env}"`);
                        if (f.default) attrs.push(`default_value = "${f.default}"`);
                        if (f.about) attrs.push(`help = "${f.about}"`);
                        const ident = rustIdent(snakeCase(f.name));
                        const ty = f.nullable ? rustType(f.type, true) : rustType(f.type, false);
                        return `\n    #[arg(${attrs.join(", ")})]\n    pub ${ident}: ${ty},`;
                      }).join("")}
                      {children.length > 0 && `\n    #[command(subcommand)]\n    pub command: ${cmd.model}Subcommand,`}
                    </StructDeclaration>
                    {children.length > 0 && <>
                      {"\n\n"}
                      <EnumDeclaration name={`${cmd.model}Subcommand`} derive={["Debug", "Clone", "Subcommand"]}>
                        <List hardline>
                          {children.map(child => {
                            const childCmd = db.cli_commands.find(c => c.model === child);
                            return <>
                              {childCmd?.about && `/// ${childCmd.about}\n`}
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

            {/* ── Config + CLI merge ── */}
            {mergeSections && (
              <AutoZone id="config-cli-merge">
                {mergeSections}
              </AutoZone>
            )}

            {/* ── HTTP routes ── */}
            {httpSections && (
              <AutoZone id="http-routes">
                {httpSections}
              </AutoZone>
            )}

            <ManualZone>
              {"// Custom code below this line is preserved across re-generation.\n"}
            </ManualZone>

          </ReplaceFile>
        </CrateDirectory>
      </VisibilityContext.Provider>
    </Output>
  );

  const output = render(tree);
  return findFileContent(output, "generated.rs");
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
