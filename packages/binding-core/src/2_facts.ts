// Fact extractor -- walks Program after type checking, reads decorator state,
// produces flat fact tables for downstream emitters (SQL, Rust, TS, etc.)

import type {
  Model,
  ModelProperty,
  Namespace,
  Program,
  Scalar,
  Type,
  Union,
} from "@typespec/compiler";
import {
  isPk,
  isManual,
  getUnique,
  getIndex,
  getDefault,
  hasDefault,
  getBinding,
  hasBinding,
  getAllRelations,
  isSourceGraphql,
  getSourceRest,
  hasSourceRest,
  isSourcePaginated,
  getSourcePollInterval,
  hasSourcePollInterval,
  getSourceNested,
  getSyncStrategy,
  hasSyncStrategy,
  isConfigSource,
  hasConfigEnv,
  getConfigEnv,
  isConfigSecret,
  hasConfigPath,
  getConfigPath,
  isCliCommand,
  isCliFlag,
  hasCliArg,
  getCliArg,
  hasCliShort,
  getCliShort,
  hasCliAbout,
  getCliAbout,
  getCliSubcommand,
  isHttpRouter,
  getHttpRoutes,
  getHttpState,
} from "./decorators.js";

// ── Fact table row types ──────────────────────────────────

export interface EntityFact {
  name: string;
}

export interface FieldFact {
  entity: string;
  name: string;
  type: string; // resolved scalar name: "string" | "integer" | "boolean" | "float64" | model name
  nullable: boolean;
  is_dot_path: boolean;
}

export interface PkFact {
  entity: string;
  field: string;
}

export interface UniqueFact {
  entity: string;
  fields: string[];
}

export interface IndexFact {
  entity: string;
  fields: string[];
}

export interface ManualFact {
  entity: string;
  field: string;
}

export interface DefaultFact {
  entity: string;
  field: string;
  value: string; // verbatim SQL: "'main'" or "(strftime(...))"
}

export interface RelationFact {
  entity: string;
  field: string;
  kind: "belongsTo" | "hasMany" | "hasOne" | "manyToMany";
  target: string;
}

export interface BindingFact {
  name: string;
  source: string;
  target: string;
}

export interface FieldMapFact {
  binding: string;
  target_field: string;
  source_chain: string[]; // e.g. ["GhPullRequest.headRefName"] or ["GhPullRequest.owner", "GhUser.login"]
}

export interface AutoMapFact {
  binding: string;
  field: string;
}

export interface SourceFact {
  model: string;
  transport: "graphql" | "rest";
  endpoint?: string; // REST path pattern
  paginated: boolean;
  poll_interval?: number;
}

export interface SourceNestedFact {
  model: string;
  parent: string;
  path: string; // JSON traversal from parent, e.g. "reviews.nodes"
}

export interface SyncStrategyFact {
  entity: string;
  strategy: "upsert" | "insert-ignore" | "delete-replace";
}

export interface SourceFieldFact {
  model: string;
  name: string;
  type: string;
  nullable: boolean;
}

// Config facts
export interface ConfigModelFact {
  model: string;
  path?: string; // config file path pattern
}

export interface ConfigFieldFact {
  model: string;
  name: string;
  type: string;
  nullable: boolean;
  env?: string; // env var override
  secret: boolean;
  default?: string; // default value from @Entity.default
}

// Cli facts
export interface CliCommandFact {
  model: string;
  parent?: string; // subcommand parent
  about?: string;
}

export interface CliFieldFact {
  model: string;
  name: string;
  type: string;
  nullable: boolean;
  kind: "flag" | "arg";
  position?: number; // for positional args
  short?: string;
  about?: string;
  env?: string; // from @Config.env if cross-decorated
  default?: string;
}

// Http facts
export interface HttpRouterFact {
  model: string;
  state_model?: string; // config model for axum State
}

export interface HttpRouteFact {
  router: string;
  method: "get" | "post" | "put" | "delete";
  path: string;
  handler: string; // property name as handler fn name
}

export interface FactDB {
  entities: EntityFact[];
  fields: FieldFact[];
  pks: PkFact[];
  uniques: UniqueFact[];
  indexes: IndexFact[];
  defaults: DefaultFact[];
  manuals: ManualFact[];
  relations: RelationFact[];
  bindings: BindingFact[];
  field_maps: FieldMapFact[];
  auto_maps: AutoMapFact[];
  sources: SourceFact[];
  source_nested: SourceNestedFact[];
  sync_strategies: SyncStrategyFact[];
  source_fields: SourceFieldFact[];
  // Config/Cli/Http
  config_models: ConfigModelFact[];
  config_fields: ConfigFieldFact[];
  cli_commands: CliCommandFact[];
  cli_fields: CliFieldFact[];
  http_routers: HttpRouterFact[];
  http_routes: HttpRouteFact[];
}

// ── Type resolution ───────────────────────────────────────

function resolveScalarName(scalar: Scalar): string {
  // Preserve integer/float distinction -- don't collapse to "numeric"
  // Walk one level at a time; stop at integer/float/string/boolean/etc.
  const meaningful = new Set([
    "integer", "int8", "int16", "int32", "int64",
    "uint8", "uint16", "uint32", "uint64",
    "float", "float32", "float64",
    "string", "boolean", "bytes", "plainDate", "plainTime",
    "utcDateTime", "offsetDateTime", "duration", "url",
    "numeric", // fallback if nothing more specific
  ]);
  let best = scalar.name;
  let current = scalar;
  while (current.baseScalar) {
    if (meaningful.has(current.name)) {
      best = current.name;
      break;
    }
    current = current.baseScalar;
  }
  // If we walked all the way to root without hitting a meaningful name, use root
  if (!meaningful.has(best)) best = current.name;
  return best;
}

/** Unwrap `T | null` unions, return [resolved type name, nullable]. */
function resolveFieldType(type: Type): { typeName: string; nullable: boolean } {
  if (type.kind === "Union") {
    const union = type as Union;
    const variants = [...union.variants.values()];
    const nonNull = variants.filter(
      (v) => !(v.type.kind === "Intrinsic" && (v.type as any).name === "null"),
    );
    const hasNull = variants.length > nonNull.length;
    if (nonNull.length === 1) {
      const inner = resolveFieldType(nonNull[0].type);
      return { typeName: inner.typeName, nullable: true };
    }
    // Multi-type union without null: just call it "string" for now
    return { typeName: "string", nullable: hasNull };
  }
  if (type.kind === "Scalar") return { typeName: resolveScalarName(type as Scalar), nullable: false };
  if (type.kind === "Model") return { typeName: (type as Model).name, nullable: false };
  if (type.kind === "Enum") return { typeName: (type as any).name, nullable: false };
  // never, void, etc.
  return { typeName: type.kind.toLowerCase(), nullable: false };
}

// ── Model classification ──────────────────────────────────

/** A model is an entity if any of its properties have Entity.* or Rel.* decorators. */
function isEntityModel(program: Program, model: Model): boolean {
  for (const [, prop] of model.properties) {
    if (isPk(program, prop)) return true;
    if (isManual(program, prop)) return true;
    if (getUnique(program, prop)?.length) return true;
    if (getIndex(program, prop)?.length) return true;
  }
  // Check relations
  const rels = getAllRelations(program);
  if (rels.has(model.name)) return true;
  return false;
}

// ── Binding field map extraction ──────────────────────────

/** Extract field mappings from a binding model's properties.
 *  Each property value is a Tuple of ModelProperty refs. */
function extractFieldMaps(
  bindingModel: Model,
  sourceModel: Model,
  targetModel: Model,
): { fieldMaps: FieldMapFact[]; autoMaps: AutoMapFact[] } {
  const fieldMaps: FieldMapFact[] = [];
  const autoMaps: AutoMapFact[] = [];
  const explicitTargetFields = new Set<string>();

  // Explicit mappings from binding model properties
  for (const [, prop] of bindingModel.properties) {
    explicitTargetFields.add(prop.name);
    const chain = extractChain(prop.type);
    if (chain.length > 0) {
      fieldMaps.push({
        binding: bindingModel.name,
        target_field: prop.name,
        source_chain: chain,
      });
    }
  }

  // Auto-map: fields on target that share a name with source and aren't explicitly mapped
  const sourceFields = new Set<string>();
  for (const [, prop] of sourceModel.properties) {
    sourceFields.add(prop.name);
  }

  for (const [, prop] of targetModel.properties) {
    if (explicitTargetFields.has(prop.name)) continue;
    if (prop.name.includes(".")) continue; // dot-paths don't auto-map
    if (prop.name.startsWith("_")) continue; // index markers
    if (sourceFields.has(prop.name)) {
      autoMaps.push({ binding: bindingModel.name, field: prop.name });
    }
  }

  return { fieldMaps, autoMaps };
}

/** Walk a Tuple type to extract "Model.property" chain strings. */
function extractChain(type: Type): string[] {
  if (type.kind === "Tuple") {
    const tuple = type as any;
    return tuple.values.map((v: any) => {
      if (v.kind === "ModelProperty") {
        const mp = v as ModelProperty;
        const parentName = mp.model?.name ?? "?";
        return `${parentName}.${mp.name}`;
      }
      return String(v);
    });
  }
  return [];
}

// ── Main extractor ────────────────────────────────────────

function collectModels(ns: Namespace): Model[] {
  const models: Model[] = [];
  for (const [, model] of ns.models) {
    if (!model.name || model.name === "") continue;
    models.push(model);
  }
  for (const [name, child] of ns.namespaces) {
    if (name === "TypeSpec" || name === "Entity" || name === "Rel" || name === "Bind") continue;
    models.push(...collectModels(child));
  }
  return models;
}

export function extractFacts(program: Program): FactDB {
  const db: FactDB = {
    entities: [],
    fields: [],
    pks: [],
    uniques: [],
    indexes: [],
    defaults: [],
    manuals: [],
    relations: [],
    bindings: [],
    field_maps: [],
    auto_maps: [],
    sources: [],
    source_nested: [],
    sync_strategies: [],
    source_fields: [],
    config_models: [],
    config_fields: [],
    cli_commands: [],
    cli_fields: [],
    http_routers: [],
    http_routes: [],
  };

  const globalNs = program.getGlobalNamespaceType();
  const allModels = collectModels(globalNs);

  // Pass 1: Identify entities and extract field/decorator facts
  const entityModels = new Map<string, Model>();

  for (const model of allModels) {
    if (!isEntityModel(program, model)) continue;
    entityModels.set(model.name, model);
    db.entities.push({ name: model.name });

    for (const [, prop] of model.properties) {
      // Check decorators on ALL properties (including never-typed index markers)
      if (isPk(program, prop)) {
        db.pks.push({ entity: model.name, field: prop.name });
      }
      if (isManual(program, prop)) {
        db.manuals.push({ entity: model.name, field: prop.name });
      }
      const uniqueEntries = getUnique(program, prop);
      if (uniqueEntries?.length) {
        for (const u of uniqueEntries) {
          db.uniques.push({ entity: model.name, fields: u.fields });
        }
      }
      const indexEntries = getIndex(program, prop);
      if (indexEntries?.length) {
        for (const idx of indexEntries) {
          db.indexes.push({ entity: model.name, fields: idx.fields });
        }
      }
      const defaultVal = getDefault(program, prop);
      if (defaultVal !== undefined) {
        db.defaults.push({ entity: model.name, field: prop.name, value: defaultVal });
      }

      // Skip index marker fields from the fields table (type: never, name starts with _)
      if (prop.type.kind === "Intrinsic" && (prop.type as any).name === "never") continue;

      const { typeName, nullable } = resolveFieldType(prop.type);
      const isDotPath = prop.name.includes(".");

      db.fields.push({
        entity: model.name,
        name: prop.name,
        type: typeName,
        nullable,
        is_dot_path: isDotPath,
      });
    }
  }

  // Pass 2: Relations
  const relMap = getAllRelations(program);
  for (const [modelName, rels] of relMap) {
    for (const rel of rels) {
      let targetType = rel.targetType;
      // Unwrap arrays: Model[] -> Model
      if (
        targetType?.kind === "Model" &&
        (targetType as Model).indexer?.value
      ) {
        targetType = (targetType as Model).indexer!.value;
      }
      db.relations.push({
        entity: modelName,
        field: rel.property,
        kind: rel.kind,
        target: targetType?.kind === "Model" ? (targetType as Model).name : "?",
      });
    }
  }

  // Pass 3: Bindings + field maps
  for (const model of allModels) {
    if (!hasBinding(program, model)) continue;
    const binding = getBinding(program, model)!;
    db.bindings.push({
      name: model.name,
      source: binding.sourceModel.name,
      target: binding.targetModel.name,
    });

    const { fieldMaps, autoMaps } = extractFieldMaps(
      model,
      binding.sourceModel,
      binding.targetModel,
    );
    db.field_maps.push(...fieldMaps);
    db.auto_maps.push(...autoMaps);
  }

  // Pass 4: Source model facts (transport, endpoint, nesting, fields)
  for (const model of allModels) {
    const isGql = isSourceGraphql(program, model);
    const restPath = hasSourceRest(program, model) ? getSourceRest(program, model) : undefined;
    if (!isGql && !restPath) continue;

    const pollInterval = hasSourcePollInterval(program, model)
      ? getSourcePollInterval(program, model)
      : undefined;

    db.sources.push({
      model: model.name,
      transport: isGql ? "graphql" : "rest",
      endpoint: restPath,
      paginated: isSourcePaginated(program, model),
      poll_interval: pollInterval,
    });

    // Extract source model fields for GraphQL query gen and JSON factory gen
    for (const [, prop] of model.properties) {
      if (prop.type.kind === "Intrinsic" && (prop.type as any).name === "never") continue;
      const { typeName, nullable } = resolveFieldType(prop.type);
      db.source_fields.push({
        model: model.name,
        name: prop.name,
        type: typeName,
        nullable,
      });
    }

    // Nested source
    const nested = getSourceNested(program, model.name);
    if (nested) {
      db.source_nested.push({
        model: model.name,
        parent: nested.parent,
        path: nested.path,
      });
    }
  }

  // Pass 4b: Extract fields from models referenced as field types by source models
  // (e.g., GhUser referenced as author field type in GhPullRequest)
  const sourceFieldTypes = new Set(db.source_fields.map(sf => sf.type));
  const extractedModels = new Set(db.sources.map(s => s.model));
  for (const model of allModels) {
    if (extractedModels.has(model.name)) continue;
    if (!sourceFieldTypes.has(model.name)) continue;
    for (const [, prop] of model.properties) {
      if (prop.type.kind === "Intrinsic" && (prop.type as any).name === "never") continue;
      const { typeName, nullable } = resolveFieldType(prop.type);
      db.source_fields.push({
        model: model.name,
        name: prop.name,
        type: typeName,
        nullable,
      });
    }
  }

  // Pass 5: Sync strategy on entity models
  for (const model of allModels) {
    if (!entityModels.has(model.name)) continue;
    if (hasSyncStrategy(program, model)) {
      db.sync_strategies.push({
        entity: model.name,
        strategy: getSyncStrategy(program, model) as any,
      });
    }
  }

  // Pass 6: Config models and fields
  for (const model of allModels) {
    if (!isConfigSource(program, model)) continue;

    db.config_models.push({
      model: model.name,
      path: hasConfigPath(program, model) ? getConfigPath(program, model) : undefined,
    });

    for (const [, prop] of model.properties) {
      if (prop.type.kind === "Intrinsic" && (prop.type as any).name === "never") continue;
      const { typeName, nullable } = resolveFieldType(prop.type);
      const fieldDefault = hasDefault(program, prop) ? getDefault(program, prop) : undefined;
      db.config_fields.push({
        model: model.name,
        name: prop.name,
        type: typeName,
        nullable,
        env: hasConfigEnv(program, prop) ? getConfigEnv(program, prop) : undefined,
        secret: isConfigSecret(program, prop),
        default: fieldDefault,
      });
    }
  }

  // Pass 7: Cli commands and fields
  for (const model of allModels) {
    if (!isCliCommand(program, model)) continue;

    const sub = getCliSubcommand(program, model.name);
    db.cli_commands.push({
      model: model.name,
      parent: sub?.parent,
      about: hasCliAbout(program, model) ? getCliAbout(program, model) : undefined,
    });

    for (const [, prop] of model.properties) {
      if (prop.type.kind === "Intrinsic" && (prop.type as any).name === "never") continue;
      const { typeName, nullable } = resolveFieldType(prop.type);

      const isFlagField = isCliFlag(program, prop);
      const isArgField = hasCliArg(program, prop);
      if (!isFlagField && !isArgField) continue;

      // Cross-cutting: pick up @Config.env if present on the same field
      const envName = hasConfigEnv(program, prop) ? getConfigEnv(program, prop) : undefined;
      const fieldDefault = hasDefault(program, prop) ? getDefault(program, prop) : undefined;

      db.cli_fields.push({
        model: model.name,
        name: prop.name,
        type: typeName,
        nullable,
        kind: isArgField ? "arg" : "flag",
        position: isArgField ? getCliArg(program, prop) : undefined,
        short: hasCliShort(program, prop) ? getCliShort(program, prop) : undefined,
        about: hasCliAbout(program, prop) ? getCliAbout(program, prop) : undefined,
        env: envName,
        default: fieldDefault,
      });
    }
  }

  // Pass 8: Http routers and routes
  for (const model of allModels) {
    if (!isHttpRouter(program, model)) continue;

    db.http_routers.push({
      model: model.name,
      state_model: getHttpState(program, model.name),
    });

    const routes = getHttpRoutes(program, model.name);
    if (routes) {
      for (const route of routes) {
        // Find the property name that triggered this route
        // Routes are stored in order of property iteration
        db.http_routes.push({
          router: model.name,
          method: route.method,
          path: route.path,
          handler: snakeCaseName(route.path),
        });
      }
    }
  }

  return db;
}

function snakeCaseName(path: string): string {
  // /api/prs/:id -> api_prs_by_id
  return path
    .replace(/^\//, "")
    .replace(/\/:(\w+)/g, "_by_$1")
    .replace(/\//g, "_")
    .replace(/-/g, "_");
}
