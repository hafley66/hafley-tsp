import type { Model, ModelProperty, Namespace, Program, Scalar, Type, Union } from "@typespec/compiler";
import { getAllRelations, getDefault, getIndex, getUnique, hasDefault, isManual, isPk, type RelationDef } from "./1_decorators.js";

export function snakeCase(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/\./g, "_").toLowerCase();
}

export function resolveRelTarget(rel: { targetType: Type | undefined }): string {
  let type = rel.targetType;
  if (type?.kind === "Model" && (type as Model).indexer?.value) type = (type as Model).indexer!.value;
  return type?.kind === "Model" ? (type as Model).name : "?";
}

export interface ResolvedField {
  prop: ModelProperty;
  name: string;
  typeName: string;
  nullable: boolean;
  isDotPath: boolean;
  isPk: boolean;
  isManual: boolean;
  default?: string;
  rel?: RelationDef;
}

export function resolvedFields(program: Program, model: Model, relMap: Map<string, RelationDef[]>): ResolvedField[] {
  const relByField = new Map((relMap.get(model.name) ?? []).map((relation) => [relation.property, relation]));
  const result: ResolvedField[] = [];
  for (const [, prop] of model.properties) {
    if (prop.type.kind === "Intrinsic" && prop.type.name === "never") continue;
    const { typeName, nullable } = resolveFieldType(prop.type);
    result.push({
      prop,
      name: prop.name,
      typeName,
      nullable,
      isDotPath: prop.name.includes("."),
      isPk: isPk(program, prop),
      isManual: isManual(program, prop),
      default: hasDefault(program, prop) ? getDefault(program, prop) : undefined,
      rel: relByField.get(prop.name),
    });
  }
  return result;
}

export function resolveScalarName(scalar: Scalar): string {
  const meaningful = new Set([
    "integer", "int8", "int16", "int32", "int64", "uint8", "uint16", "uint32", "uint64",
    "float", "float32", "float64", "string", "boolean", "bytes", "plainDate", "plainTime",
    "utcDateTime", "offsetDateTime", "duration", "url", "numeric",
  ]);
  let best = scalar.name;
  let current = scalar;
  while (current.baseScalar) {
    if (meaningful.has(current.name)) { best = current.name; break; }
    current = current.baseScalar;
  }
  if (!meaningful.has(best)) best = current.name;
  return best;
}

export function resolveFieldType(type: Type): { typeName: string; nullable: boolean } {
  if (type.kind === "Union") {
    const variants = [...(type as Union).variants.values()];
    const nonNull = variants.filter((variant) => !(variant.type.kind === "Intrinsic" && variant.type.name === "null"));
    const hasNull = variants.length > nonNull.length;
    if (nonNull.length === 1) {
      const inner = resolveFieldType(nonNull[0].type);
      return { typeName: inner.typeName, nullable: true };
    }
    return { typeName: "string", nullable: hasNull };
  }
  if (type.kind === "Scalar") return { typeName: resolveScalarName(type), nullable: false };
  if (type.kind === "Model") return { typeName: type.name, nullable: false };
  if (type.kind === "Enum") return { typeName: type.name, nullable: false };
  return { typeName: type.kind.toLowerCase(), nullable: false };
}

export function isEntityModel(program: Program, model: Model): boolean {
  for (const [, prop] of model.properties) {
    if (isPk(program, prop) || isManual(program, prop) || getUnique(program, prop)?.length || getIndex(program, prop)?.length) return true;
  }
  return getAllRelations(program).has(model.name);
}

export function collectModels(namespace: Namespace): Model[] {
  const models: Model[] = [];
  for (const [, model] of namespace.models) if (model.name) models.push(model);
  for (const [name, child] of namespace.namespaces) {
    if (["TypeSpec", "Entity", "Rel", "Bind"].includes(name)) continue;
    models.push(...collectModels(child));
  }
  return models;
}
