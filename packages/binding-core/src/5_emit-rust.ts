// Rust emitter -- consumes FactDB, produces:
//   - Row structs with serde derives
//   - Upsert/insert functions with sqlx bind chains
//   - JSON extraction functions (source model → entity fields)
//   - Sync pipeline skeletons (poll, fetch, parse, upsert loop)

import type { FactDB, FieldFact, RelationFact } from "./2_facts.js";

// ── Type mapping ──────────────────────────────────────────

const RUST_TYPE: Record<string, string> = {
  string: "String",
  integer: "i64",
  int8: "i8",
  int16: "i16",
  int32: "i32",
  int64: "i64",
  uint8: "u8",
  uint16: "u16",
  uint32: "u32",
  uint64: "u64",
  float: "f64",
  float32: "f32",
  float64: "f64",
  boolean: "bool",
  bytes: "Vec<u8>",
};

function rustType(tspType: string, nullable: boolean): string {
  const base = RUST_TYPE[tspType] ?? "String";
  return nullable ? `Option<${base}>` : base;
}

function snakeCase(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/\./g, "_")
    .toLowerCase();
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
  for (const rel of db.relations) {
    relsByKey.set(`${rel.entity}.${rel.field}`, rel);
  }

  const defaultsByKey = new Map<string, string>();
  for (const d of db.defaults) {
    defaultsByKey.set(`${d.entity}.${d.field}`, d.value);
  }

  const uniquesByEntity = new Map<string, string[][]>();
  for (const u of db.uniques) {
    if (!uniquesByEntity.has(u.entity)) uniquesByEntity.set(u.entity, []);
    uniquesByEntity.get(u.entity)!.push(u.fields);
  }

  const manualFields = new Set<string>();
  for (const m of db.manuals) {
    manualFields.add(`${m.entity}.${m.field}`);
  }

  const syncStrategyByEntity = new Map<string, string>();
  for (const s of db.sync_strategies) {
    syncStrategyByEntity.set(s.entity, s.strategy);
  }

  const bindingByTarget = new Map<string, string>();
  const bindingByName = new Map<string, { source: string; target: string }>();
  for (const b of db.bindings) {
    bindingByTarget.set(b.target, b.name);
    bindingByName.set(b.name, { source: b.source, target: b.target });
  }

  const sourceByModel = new Map<string, (typeof db.sources)[0]>();
  for (const s of db.sources) {
    sourceByModel.set(s.model, s);
  }

  const nestedByModel = new Map<string, (typeof db.source_nested)[0]>();
  for (const n of db.source_nested) {
    nestedByModel.set(n.model, n);
  }

  return {
    pksByEntity,
    relsByKey,
    defaultsByKey,
    uniquesByEntity,
    manualFields,
    syncStrategyByEntity,
    bindingByTarget,
    bindingByName,
    sourceByModel,
    nestedByModel,
  };
}

// ── Row struct emitter ────────────────────────────────────

function emitRowStruct(
  entityName: string,
  fields: FieldFact[],
  rels: Map<string, RelationFact>,
): string {
  const structName = entityName;
  const lines = [
    `#[derive(Debug, Clone, Serialize, Deserialize)]`,
    `pub struct ${structName} {`,
  ];

  for (const f of fields) {
    const col = snakeCase(f.name).replace(/\./g, "_");
    const rel = rels.get(`${entityName}.${f.name}`);
    const fieldName = rel ? `${col}_id` : col;
    // FK fields are always i64 (reference to target's integer PK)
    const ty = rel ? (f.nullable ? "Option<i64>" : "i64") : rustType(f.type, f.nullable);
    lines.push(`    pub ${fieldName}: ${ty},`);
  }

  lines.push(`}`);
  return lines.join("\n");
}

// ── Upsert function emitter ──────────────────────────────

function emitUpsertFn(
  entityName: string,
  fields: FieldFact[],
  lookups: ReturnType<typeof buildLookups>,
): string {
  const { pksByEntity, relsByKey, defaultsByKey, uniquesByEntity, manualFields, syncStrategyByEntity } = lookups;
  const tableName = snakeCase(entityName);
  const pks = pksByEntity.get(entityName) ?? [];
  const strategy = syncStrategyByEntity.get(entityName) ?? "upsert";

  // Determine which fields are in the upsert (skip autoincrement PK, manual fields, default-only fields)
  const isAutoIncrPk = pks.length === 1 && fields.find(f => f.name === pks[0])?.type === "integer";
  const upsertFields = fields.filter(f => {
    if (isAutoIncrPk && pks.includes(f.name)) return false; // skip autoincrement PK
    if (manualFields.has(`${entityName}.${f.name}`)) return false;
    return true;
  });

  const colNames = upsertFields.map(f => sqlColName(f, relsByKey));
  const placeholders = upsertFields.map(() => "?").join(", ");

  const fnName = strategy === "insert-ignore" ? `insert_${tableName}` : `upsert_${tableName}`;
  const lines: string[] = [];

  // Function signature
  const params = upsertFields.map(f => {
    const rel = relsByKey.get(`${entityName}.${f.name}`);
    const paramName = rel ? `${snakeCase(f.name)}_id` : snakeCase(f.name).replace(/\./g, "_");
    const ty = rel ? (f.nullable ? "Option<i64>" : "i64") : rustType(f.type, f.nullable);
    // Use references for String types
    const paramTy = ty === "String" ? "&str" : ty === "Option<String>" ? "Option<&str>" : ty;
    return `${paramName}: ${paramTy}`;
  });

  const returnsId = isAutoIncrPk;

  lines.push(`pub async fn ${fnName}(`);
  lines.push(`    conn: &mut SqliteConnection,`);
  for (const p of params) {
    lines.push(`    ${p},`);
  }
  lines.push(`) -> Result<${returnsId ? "i64" : "()"}> {`);

  if (strategy === "insert-ignore") {
    // INSERT OR IGNORE
    lines.push(`    sqlx::query(`);
    lines.push(`        "INSERT OR IGNORE INTO ${tableName}`);
    lines.push(`         (${colNames.join(", ")})`);
    lines.push(`         VALUES (${placeholders})"`);
    lines.push(`    )`);
  } else if (strategy === "delete-replace") {
    // For junction tables: caller handles DELETE, this just inserts
    lines.push(`    sqlx::query(`);
    lines.push(`        "INSERT OR IGNORE INTO ${tableName}`);
    lines.push(`         (${colNames.join(", ")})`);
    lines.push(`         VALUES (${placeholders})"`);
    lines.push(`    )`);
  } else {
    // UPSERT: INSERT ON CONFLICT DO UPDATE
    const uniques = uniquesByEntity.get(entityName) ?? [];
    const conflictCols = uniques[0]?.map(f => {
      const rel = relsByKey.get(`${entityName}.${f}`);
      return rel ? `${snakeCase(f)}_id` : snakeCase(f);
    }) ?? [];

    const updateCols = colNames.filter(c => !conflictCols.includes(c) && !pks.map(p => snakeCase(p)).includes(c));

    lines.push(`    let id: i64 = sqlx::query_scalar(`);
    lines.push(`        "INSERT INTO ${tableName}`);
    lines.push(`         (${colNames.join(", ")})`);
    lines.push(`         VALUES (${placeholders})`);
    if (conflictCols.length > 0) {
      lines.push(`         ON CONFLICT(${conflictCols.join(", ")}) DO UPDATE SET`);
      lines.push(`             ${updateCols.map(c => `${c} = excluded.${c}`).join(",\n             ")}`);
    }
    lines.push(`         RETURNING id"`);
    lines.push(`    )`);
  }

  // Bind chain
  for (const f of upsertFields) {
    const rel = relsByKey.get(`${entityName}.${f.name}`);
    const paramName = rel ? `${snakeCase(f.name)}_id` : snakeCase(f.name).replace(/\./g, "_");
    lines.push(`    .bind(${paramName})`);
  }

  if (strategy === "upsert" && returnsId) {
    lines.push(`    .fetch_one(conn)`);
    lines.push(`    .await?;`);
    lines.push(`    Ok(id)`);
  } else {
    lines.push(`    .execute(conn)`);
    lines.push(`    .await?;`);
    lines.push(`    Ok(())`);
  }

  lines.push(`}`);
  return lines.join("\n");
}

// ── JSON extraction emitter ──────────────────────────────

function emitExtractFn(
  bindingName: string,
  db: FactDB,
  lookups: ReturnType<typeof buildLookups>,
): string {
  const { bindingByName, relsByKey } = lookups;
  const info = bindingByName.get(bindingName);
  if (!info) return "";

  const entityFields = db.fields.filter(f => f.entity === info.target);
  const fieldMaps = db.field_maps.filter(fm => fm.binding === bindingName);
  const autoMaps = db.auto_maps.filter(am => am.binding === bindingName);
  const manuals = new Set(db.manuals.filter(m => m.entity === info.target).map(m => m.field));
  const pks = new Set((lookups.pksByEntity.get(info.target) ?? []).filter(p => {
    // Skip autoincrement PK from extraction
    const field = entityFields.find(f => f.name === p);
    return !(field?.type === "integer" && (lookups.pksByEntity.get(info.target) ?? []).length === 1);
  }));

  const fnName = `extract_${snakeCase(info.target)}`;
  const lines: string[] = [];

  lines.push(`/// Extract ${info.target} fields from a ${info.source} JSON value.`);
  lines.push(`pub fn ${fnName}(src: &serde_json::Value) -> ${info.target}Fields {`);

  // Build a map of target field → extraction expression
  const fieldMapByTarget = new Map<string, string[]>();
  for (const fm of fieldMaps) {
    fieldMapByTarget.set(fm.target_field, fm.source_chain);
  }

  const autoMapSet = new Set(autoMaps.map(am => am.field));

  for (const field of entityFields) {
    const rel = relsByKey.get(`${info.target}.${field.name}`);
    if (rel) continue; // FK fields come from elsewhere (parent entity id)
    if (manuals.has(field.name)) continue; // manual fields skipped

    const col = snakeCase(field.name).replace(/\./g, "_");
    const chain = fieldMapByTarget.get(field.name);

    if (chain) {
      // Explicit mapping: follow the chain through JSON
      const jsonPath = chain.map(link => {
        const dot = link.indexOf(".");
        return dot >= 0 ? link.substring(dot + 1) : link;
      });
      const accessor = jsonPath.map(p => `["${p}"]`).join("");
      lines.push(`    let ${col} = ${emitJsonAccess(`src${accessor}`, field)};`);
    } else if (field.is_dot_path) {
      // Dot-path: split on dots for JSON traversal
      const parts = field.name.split(".");
      const accessor = parts.map(p => `["${p}"]`).join("");
      lines.push(`    let ${col} = ${emitJsonAccess(`src${accessor}`, field)};`);
    } else if (autoMapSet.has(field.name)) {
      // Auto-map: same name on source and target
      lines.push(`    let ${col} = ${emitJsonAccess(`src["${field.name}"]`, field)};`);
    }
  }

  // Build struct
  lines.push(`    ${info.target}Fields {`);
  for (const field of entityFields) {
    const rel = relsByKey.get(`${info.target}.${field.name}`);
    if (rel) continue;
    if (manuals.has(field.name)) continue;
    const col = snakeCase(field.name).replace(/\./g, "_");
    lines.push(`        ${col},`);
  }
  lines.push(`    }`);
  lines.push(`}`);

  return lines.join("\n");
}

function emitJsonAccess(expr: string, field: FieldFact): string {
  const base = RUST_TYPE[field.type] ?? "String";
  if (base === "String") {
    return field.nullable
      ? `${expr}.as_str().map(|s| s.to_owned())`
      : `${expr}.as_str().unwrap_or("").to_owned()`;
  }
  if (base === "i64") {
    return field.nullable
      ? `${expr}.as_i64()`
      : `${expr}.as_i64().unwrap_or(0)`;
  }
  if (base === "bool") {
    return field.nullable
      ? `${expr}.as_bool()`
      : `${expr}.as_bool().unwrap_or(false)`;
  }
  if (base === "f64") {
    return field.nullable
      ? `${expr}.as_f64()`
      : `${expr}.as_f64().unwrap_or(0.0)`;
  }
  // Fallback: treat as string
  return field.nullable
    ? `${expr}.as_str().map(|s| s.to_owned())`
    : `${expr}.as_str().unwrap_or("").to_owned()`;
}

// ── Sync pipeline emitter ─────────────────────────────────

function emitSyncFn(
  entityName: string,
  db: FactDB,
  lookups: ReturnType<typeof buildLookups>,
): string {
  const { bindingByTarget, bindingByName, sourceByModel, relsByKey, syncStrategyByEntity } = lookups;
  const bindingName = bindingByTarget.get(entityName);
  if (!bindingName) return ""; // no binding = infra entity, no sync

  const binding = bindingByName.get(bindingName)!;
  const source = sourceByModel.get(binding.source);
  if (!source) return ""; // no source decorator

  const tableName = snakeCase(entityName);
  const fnName = `sync_${tableName}`;
  const strategy = syncStrategyByEntity.get(entityName) ?? "upsert";

  // Find parent FK if this entity has a belongsTo relation
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
  if (parentRelDef) {
    lines.push(`    ${snakeCase(parentRel!.name)}_id: i64,`);
  }
  if (source.transport === "rest" && source.endpoint?.includes("{owner}")) {
    lines.push(`    owner: &str,`);
    lines.push(`    name: &str,`);
  }
  lines.push(`) -> Result<()> {`);

  if (source.transport === "rest") {
    const endpoint = source.endpoint ?? `/${tableName}`;
    const endpointExpr = endpoint.includes("{owner}")
      ? `format!("${endpoint.replace(/\{owner\}/g, "{owner}").replace(/\{name\}/g, "{name}")}")`
      : `"${endpoint}".to_owned()`;

    lines.push(`    let endpoint = ${endpointExpr};`);
    lines.push(`    let poll = db::get_poll_state(conn, &endpoint).await?;`);
    lines.push(``);

    if (source.poll_interval) {
      lines.push(`    if let (Some(interval), Some(ref last_polled)) = (poll.poll_interval, &poll.last_polled_at) {`);
      lines.push(`        if let Ok(last) = chrono::DateTime::parse_from_rfc3339(last_polled) {`);
      lines.push(`            let elapsed = chrono::Utc::now().signed_duration_since(last).num_seconds();`);
      lines.push(`            if elapsed < interval { return Ok(()); }`);
      lines.push(`        }`);
      lines.push(`    }`);
      lines.push(``);
    }

    lines.push(`    let mut req = GhRequest::get(&endpoint)${source.paginated ? ".paginated()" : ""};`);
    lines.push(`    if let Some(ref etag) = poll.etag {`);
    lines.push(`        req = req.with_etag(etag);`);
    lines.push(`    }`);
    lines.push(``);
    lines.push(`    let resp = gh.call(conn, &req).await?;`);
    lines.push(`    if resp.is_not_modified() { return Ok(()); }`);
    lines.push(``);
    lines.push(`    let items = match resp.body.as_array() {`);
    lines.push(`        Some(a) => a,`);
    lines.push(`        None => return Ok(()),`);
    lines.push(`    };`);
  } else {
    // GraphQL
    lines.push(`    gh.throttle_if_needed(conn, "graphql").await?;`);
    lines.push(`    // TODO: GraphQL query construction from source model fields`);
    lines.push(`    let items: &Vec<serde_json::Value> = todo!("wire up GraphQL query");`);
  }

  lines.push(``);
  lines.push(`    for item in items {`);
  lines.push(`        let fields = extract_${tableName}(item);`);
  lines.push(`        ${strategy === "upsert" ? `upsert_${tableName}` : `insert_${tableName}`}(conn, ${parentRelDef ? `${snakeCase(parentRel!.name)}_id, ` : ""}/* fields */).await?;`);
  lines.push(`    }`);
  lines.push(``);
  lines.push(`    Ok(())`);
  lines.push(`}`);

  return lines.join("\n");
}

// ── GraphQL fragment emitter ──────────────────────────────

function emitGraphqlFragment(
  sourceModelName: string,
  db: FactDB,
): string {
  const fields = db.source_fields.filter(f => f.model === sourceModelName);
  if (fields.length === 0) return "";

  const lines: string[] = [];
  lines.push(`/// GraphQL field selection for ${sourceModelName}`);
  lines.push(`pub const ${snakeCase(sourceModelName).toUpperCase()}_FIELDS: &str = r#"`);

  for (const f of fields) {
    // Check if this field's type is a source model itself (nested object)
    const isNested = db.sources.some(s => s.model === f.type) ||
                     db.source_fields.some(sf => sf.model === f.type);
    if (isNested) {
      const nestedFields = db.source_fields.filter(sf => sf.model === f.type);
      lines.push(`    ${f.name} { ${nestedFields.map(nf => nf.name).join(" ")} }`);
    } else {
      lines.push(`    ${f.name}`);
    }
  }

  lines.push(`"#;`);
  return lines.join("\n");
}

// ── Main entry point ──────────────────────────────────────

export function emitRust(db: FactDB): string {
  const lookups = buildLookups(db);
  const sections: string[] = [];

  sections.push("// Generated by @hafley/typespec-binding-core -- do not edit\n");
  sections.push("use anyhow::Result;");
  sections.push("use serde::{Deserialize, Serialize};");
  sections.push("use sqlx::SqliteConnection;\n");

  // Row structs
  sections.push("// ── Row structs ──────────────────────────────────────────\n");
  for (const entity of db.entities) {
    const fields = db.fields.filter(f => f.entity === entity.name);
    sections.push(emitRowStruct(entity.name, fields, lookups.relsByKey));
    sections.push("");
  }

  // Extracted fields structs (for binding targets -- non-manual, non-FK fields)
  sections.push("// ── Extraction structs ───────────────────────────────────\n");
  for (const binding of db.bindings) {
    const fields = db.fields.filter(f => f.entity === binding.target);
    const nonFk = fields.filter(f => {
      const rel = lookups.relsByKey.get(`${binding.target}.${f.name}`);
      return !rel;
    });
    const nonManual = nonFk.filter(f => !lookups.manualFields.has(`${binding.target}.${f.name}`));
    if (nonManual.length === 0) continue;

    const lines = [`pub struct ${binding.target}Fields {`];
    for (const f of nonManual) {
      const col = snakeCase(f.name).replace(/\./g, "_");
      lines.push(`    pub ${col}: ${rustType(f.type, f.nullable)},`);
    }
    lines.push(`}`);
    sections.push(lines.join("\n"));
    sections.push("");
  }

  // Upsert functions
  sections.push("// ── Upsert functions ─────────────────────────────────────\n");
  for (const entity of db.entities) {
    const fields = db.fields.filter(f => f.entity === entity.name);
    const fn_ = emitUpsertFn(entity.name, fields, lookups);
    if (fn_) {
      sections.push(fn_);
      sections.push("");
    }
  }

  // JSON extraction functions
  sections.push("// ── JSON extraction ──────────────────────────────────────\n");
  for (const binding of db.bindings) {
    const fn_ = emitExtractFn(binding.name, db, lookups);
    if (fn_) {
      sections.push(fn_);
      sections.push("");
    }
  }

  // GraphQL fragments
  const gqlSources = db.sources.filter(s => s.transport === "graphql");
  if (gqlSources.length > 0) {
    sections.push("// ── GraphQL fragments ────────────────────────────────────\n");
    for (const source of gqlSources) {
      const frag = emitGraphqlFragment(source.model, db);
      if (frag) {
        sections.push(frag);
        sections.push("");
      }
    }
  }

  // Sync pipelines
  const syncEntities = db.entities.filter(e => lookups.bindingByTarget.has(e.name));
  if (syncEntities.length > 0) {
    sections.push("// ── Sync pipelines ───────────────────────────────────────\n");
    for (const entity of syncEntities) {
      const fn_ = emitSyncFn(entity.name, db, lookups);
      if (fn_) {
        sections.push(fn_);
        sections.push("");
      }
    }
  }

  return sections.join("\n");
}
