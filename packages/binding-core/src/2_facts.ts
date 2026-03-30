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

  return db;
}
