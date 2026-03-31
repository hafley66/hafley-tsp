// Shared utilities for walking the TSP program graph.
// Used by all emitters (SQL, Rust, Go) and $onValidate.

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
  isPk, isManual, getUnique, getIndex, getDefault, hasDefault,
  getAllRelations,
} from "./decorators.js";

// ── Shared utilities ─────────────────────────────────────

export function snakeCase(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/\./g, "_").toLowerCase();
}

/** Unwrap Model[] to Model, return target model name from a RelationDef. */
export function resolveRelTarget(rel: { targetType: Type | undefined }): string {
  let t = rel.targetType;
  if (t?.kind === "Model" && (t as Model).indexer?.value) {
    t = (t as Model).indexer!.value;
  }
  return t?.kind === "Model" ? (t as Model).name : "?";
}

/** Per-field resolved info -- the common query every emitter runs on each property. */
export interface ResolvedField {
  prop: ModelProperty;
  name: string;
  typeName: string;
  nullable: boolean;
  isDotPath: boolean;
  isPk: boolean;
  isManual: boolean;
  default?: string;
  rel?: import("./decorators.js").RelationDef;
}

/** Walk model.properties once, skip `never` intrinsics, resolve types + common decorators. */
export function resolvedFields(
  program: Program, model: Model,
  relMap: Map<string, import("./decorators.js").RelationDef[]>,
): ResolvedField[] {
  const rels = relMap.get(model.name) ?? [];
  const relByField = new Map(rels.map(r => [r.property, r]));
  const result: ResolvedField[] = [];
  for (const [, prop] of model.properties) {
    if (prop.type.kind === "Intrinsic" && (prop.type as any).name === "never") continue;
    const { typeName, nullable } = resolveFieldType(prop.type);
    result.push({
      prop, name: prop.name, typeName, nullable,
      isDotPath: prop.name.includes("."),
      isPk: isPk(program, prop),
      isManual: isManual(program, prop),
      default: hasDefault(program, prop) ? getDefault(program, prop) : undefined,
      rel: relByField.get(prop.name),
    });
  }
  return result;
}

// ── Type resolution ───────────────────────────────────────

export function resolveScalarName(scalar: Scalar): string {
  const meaningful = new Set([
    "integer", "int8", "int16", "int32", "int64",
    "uint8", "uint16", "uint32", "uint64",
    "float", "float32", "float64",
    "string", "boolean", "bytes", "plainDate", "plainTime",
    "utcDateTime", "offsetDateTime", "duration", "url",
    "numeric",
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
  if (!meaningful.has(best)) best = current.name;
  return best;
}

/** Unwrap `T | null` unions, return [resolved type name, nullable]. */
export function resolveFieldType(type: Type): { typeName: string; nullable: boolean } {
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
    return { typeName: "string", nullable: hasNull };
  }
  if (type.kind === "Scalar") return { typeName: resolveScalarName(type as Scalar), nullable: false };
  if (type.kind === "Model") return { typeName: (type as Model).name, nullable: false };
  if (type.kind === "Enum") return { typeName: (type as any).name, nullable: false };
  return { typeName: type.kind.toLowerCase(), nullable: false };
}

// ── Model classification ──────────────────────────────────

/** A model is an entity if any of its properties have Entity.* or Rel.* decorators. */
export function isEntityModel(program: Program, model: Model): boolean {
  for (const [, prop] of model.properties) {
    if (isPk(program, prop)) return true;
    if (isManual(program, prop)) return true;
    if (getUnique(program, prop)?.length) return true;
    if (getIndex(program, prop)?.length) return true;
  }
  const rels = getAllRelations(program);
  if (rels.has(model.name)) return true;
  return false;
}

// ── Binding chain extraction ─────────────────────────────

/** Walk a Tuple type to extract "Model.property" chain strings. */
export function extractChain(type: Type): string[] {
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

// ── Namespace walker ─────────────────────────────────────

export function collectModels(ns: Namespace): Model[] {
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
