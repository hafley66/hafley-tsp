import type { DecoratorContext, ModelProperty, Program, Scalar, Type } from "@typespec/compiler";
import { flagDec, listDec, valueDec } from "@hafley/typespec-decorator-def/factory";
import { SqlStateKeys, reportSqlDiagnostic } from "./0_lib.js";

const intern = flagDec(SqlStateKeys.intern as any);
const pk = flagDec(SqlStateKeys.pk as any);
const manual = flagDec(SqlStateKeys.manual as any);
const unique = listDec<{ anchor: string; fields: string[] }>(SqlStateKeys.unique as any, (target: any, ...fields: any[]) => ({
  anchor: target.name ?? "?", fields: fields.map((field: any) => field.name ?? String(field)),
}));
const index = listDec<{ anchor: string; fields: string[] }>(SqlStateKeys.index as any, (target: any, ...fields: any[]) => ({
  anchor: target.name ?? "?", fields: fields.map((field: any) => field.name ?? String(field)),
}));
const defaultValue = valueDec<string>(SqlStateKeys.default as any);

export function $intern(ctx: DecoratorContext, target: Scalar) {
  let base = target;
  while (base.baseScalar) base = base.baseScalar;
  if (base.name !== "string" || base.namespace?.name !== "TypeSpec") {
    reportSqlDiagnostic(ctx.program, { code: "invalid-intern", target, format: { reason: "@Entity.intern requires a string-backed scalar" } });
    return;
  }
  intern.$decorator(ctx, target);
}

export function getInternScalar(program: Program, type: Type): Scalar | undefined {
  if (type.kind === "Union") {
    const values = [...type.variants.values()].map((variant) => variant.type)
      .filter((item) => !(item.kind === "Intrinsic" && item.name === "null"));
    return values.length === 1 ? getInternScalar(program, values[0]) : undefined;
  }
  if (type.kind !== "Scalar") return undefined;
  for (let scalar: Scalar | undefined = type; scalar; scalar = scalar.baseScalar) {
    if (intern.has(program, scalar)) return scalar;
  }
  return undefined;
}

export interface RelationDef {
  property: string;
  kind: "belongsTo" | "hasMany" | "hasOne" | "manyToMany";
  targetType: Type | undefined;
}

function parentModelName(target: ModelProperty): string {
  let node: any = (target as any).node;
  while (node) {
    if (node.id?.sv && node.properties) return node.id.sv;
    node = node.parent;
  }
  return target.name || "?";
}

function storeRelation(ctx: DecoratorContext, target: ModelProperty, kind: RelationDef["kind"]) {
  const map = ctx.program.stateMap(SqlStateKeys.relation) as unknown as Map<string, RelationDef[]>;
  const modelName = parentModelName(target);
  if (!map.has(modelName)) map.set(modelName, []);
  map.get(modelName)!.push({ property: target.name, kind, targetType: target.type });
}

export function $pk(ctx: DecoratorContext, target: ModelProperty) { pk.$decorator(ctx, target); }
export function $unique(ctx: DecoratorContext, target: ModelProperty, ...fields: Type[]) { unique.$decorator(ctx, target, ...fields); }
export function $manual(ctx: DecoratorContext, target: ModelProperty) { manual.$decorator(ctx, target); }
export function $index(ctx: DecoratorContext, target: ModelProperty, ...fields: Type[]) { index.$decorator(ctx, target, ...fields); }
export function $default(ctx: DecoratorContext, target: ModelProperty, value: string) { defaultValue.$decorator(ctx, target, value); }
export function $belongsTo(ctx: DecoratorContext, target: ModelProperty) { storeRelation(ctx, target, "belongsTo"); }
export function $hasMany(ctx: DecoratorContext, target: ModelProperty) { storeRelation(ctx, target, "hasMany"); }
export function $hasOne(ctx: DecoratorContext, target: ModelProperty) { storeRelation(ctx, target, "hasOne"); }
export function $manyToMany(ctx: DecoratorContext, target: ModelProperty) { storeRelation(ctx, target, "manyToMany"); }

export const isPk = pk.has;
export const isManual = manual.has;
export const getUnique = unique.get;
export const getIndex = index.get;
export const getDefault = defaultValue.get;
export const hasDefault = defaultValue.has;
export function getRelations(program: Program, modelName: string) { return (program.stateMap(SqlStateKeys.relation) as unknown as Map<string, RelationDef[]>).get(modelName); }
export function getAllRelations(program: Program) { return program.stateMap(SqlStateKeys.relation) as unknown as Map<string, RelationDef[]>; }

export const $decorators = {
  Entity: { intern: $intern, pk: $pk, unique: $unique, manual: $manual, index: $index, default: $default },
  Rel: { belongsTo: $belongsTo, hasMany: $hasMany, hasOne: $hasOne, manyToMany: $manyToMany },
};
