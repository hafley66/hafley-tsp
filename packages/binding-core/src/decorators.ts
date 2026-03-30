import type { DecoratorContext, Model, ModelProperty, Program, Type } from "@typespec/compiler";
import { BindingCoreStateKeys, reportDiagnostic } from "./lib.js";
import { flagDec, listDec, objectDec } from "@hafley/typespec-decorator-def/factory";

// ──────────────────────────────────────────────────────────
// Entity namespace
// ──────────────────────────────────────────────────────────

const _pk = flagDec(BindingCoreStateKeys.pk as any);
const _manual = flagDec(BindingCoreStateKeys.manual as any);

const _unique = listDec<{ anchor: string; fields: string[] }>(
  BindingCoreStateKeys.unique as any,
  (target: any, ...fields: any[]) => ({
    anchor: target.name ?? "?",
    fields: fields.map((f: any) => f.name ?? String(f)),
  }),
);

const _index = listDec<{ anchor: string; fields: string[] }>(
  BindingCoreStateKeys.index as any,
  (target: any, ...fields: any[]) => ({
    anchor: target.name ?? "?",
    fields: fields.map((f: any) => f.name ?? String(f)),
  }),
);

// ──────────────────────────────────────────────────────────
// Rel namespace -- stores by model name STRING (phase stable)
// ──────────────────────────────────────────────────────────

const REL_KEY = Symbol.for("hafley:relations");

export interface RelationDef {
  property: string;
  kind: "belongsTo" | "hasMany" | "hasOne" | "manyToMany";
  targetType: Type | undefined;
}

function getParentModelName(target: ModelProperty): string {
  let node: any = (target as any).node;
  while (node) {
    if (node.id?.sv && node.properties) return node.id.sv;
    node = node.parent;
  }
  return target.name || "?";
}

function storeRelation(ctx: DecoratorContext, target: ModelProperty, kind: RelationDef["kind"]) {
  const map: Map<string, RelationDef[]> = ctx.program.stateMap(REL_KEY) as any;
  const modelName = getParentModelName(target);
  if (!map.has(modelName)) map.set(modelName, []);
  map.get(modelName)!.push({ property: target.name, kind, targetType: target.type });
}

// ──────────────────────────────────────────────────────────
// Bind namespace
// ──────────────────────────────────────────────────────────

export interface BindingDef {
  sourceModel: Model;
  targetModel: Model;
}

const _binding = objectDec<BindingDef>(
  BindingCoreStateKeys.binding as any,
  (_target: any, sourceModel: any, targetModel: any) => ({
    sourceModel: sourceModel as Model,
    targetModel: targetModel as Model,
  }),
);

// ──────────────────────────────────────────────────────────
// $decorator exports (namespaced)
// ──────────────────────────────────────────────────────────

export function $pk(ctx: DecoratorContext, target: ModelProperty) {
  _pk.$decorator(ctx, target);
}
export function $unique(ctx: DecoratorContext, target: ModelProperty, ...fields: Type[]) {
  _unique.$decorator(ctx, target, ...fields);
}
export function $manual(ctx: DecoratorContext, target: ModelProperty) {
  _manual.$decorator(ctx, target);
}
export function $index(ctx: DecoratorContext, target: ModelProperty, ...fields: Type[]) {
  _index.$decorator(ctx, target, ...fields);
}

export function $belongsTo(ctx: DecoratorContext, target: ModelProperty) {
  storeRelation(ctx, target, "belongsTo");
}
export function $hasMany(ctx: DecoratorContext, target: ModelProperty) {
  storeRelation(ctx, target, "hasMany");
}
export function $hasOne(ctx: DecoratorContext, target: ModelProperty) {
  storeRelation(ctx, target, "hasOne");
}
export function $manyToMany(ctx: DecoratorContext, target: ModelProperty) {
  storeRelation(ctx, target, "manyToMany");
}

export function $from(ctx: DecoratorContext, target: Model, sourceModel: Model, targetModel: Model) {
  _binding.$decorator(ctx, target, sourceModel, targetModel);
}

// ──────────────────────────────────────────────────────────
// Accessors
// ──────────────────────────────────────────────────────────

export const isPk = _pk.has;
export const isManual = _manual.has;
export const getUnique = _unique.get;
export const getIndex = _index.get;
export const getBinding = _binding.get;
export const hasBinding = _binding.has;

export function getRelations(program: Program, modelName: string): RelationDef[] | undefined {
  return (program.stateMap(REL_KEY) as any).get(modelName);
}

export function getAllRelations(program: Program): Map<string, RelationDef[]> {
  return program.stateMap(REL_KEY) as any;
}

// ──────────────────────────────────────────────────────────
// $decorators map (TSP runtime binding)
// ──────────────────────────────────────────────────────────

export const $decorators = {
  Entity: {
    pk: $pk,
    unique: $unique,
    manual: $manual,
    index: $index,
  },
  Rel: {
    belongsTo: $belongsTo,
    hasMany: $hasMany,
    hasOne: $hasOne,
    manyToMany: $manyToMany,
  },
  Bind: {
    from: $from,
  },
};
