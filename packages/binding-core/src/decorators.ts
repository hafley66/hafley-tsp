import type { DecoratorContext, Model, ModelProperty, Program, Type } from "@typespec/compiler";
import { BindingCoreStateKeys, reportDiagnostic } from "./lib.js";
import { flagDec, listDec, objectDec, valueDec } from "@hafley/typespec-decorator-def/factory";

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

const _default = valueDec<string>(BindingCoreStateKeys.default as any);

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
export function $default(ctx: DecoratorContext, target: ModelProperty, value: string) {
  _default.$decorator(ctx, target, value);
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
export const getDefault = _default.get;
export const hasDefault = _default.has;
export const getBinding = _binding.get;
export const hasBinding = _binding.has;

export function getRelations(program: Program, modelName: string): RelationDef[] | undefined {
  return (program.stateMap(REL_KEY) as any).get(modelName);
}

export function getAllRelations(program: Program): Map<string, RelationDef[]> {
  return program.stateMap(REL_KEY) as any;
}

// ──────────────────────────────────────────────────────────
// Source namespace
// ──────────────────────────────────────────────────────────

const _sourceGraphql = flagDec(BindingCoreStateKeys.sourceGraphql as any);
const _sourceRest = valueDec<string>(BindingCoreStateKeys.sourceRest as any);
const _sourcePaginated = flagDec(BindingCoreStateKeys.sourcePaginated as any);
const _sourcePollInterval = valueDec<number>(BindingCoreStateKeys.sourcePollInterval as any);
const _sourceFreshness = valueDec<string>(BindingCoreStateKeys.sourceFreshness as any);

const SOURCE_NESTED_KEY = Symbol.for("hafley:source-nested");

export interface NestedDef {
  parent: string;
  path: string;
}

export function $graphql(ctx: DecoratorContext, target: Model) {
  _sourceGraphql.$decorator(ctx, target);
}
export function $rest(ctx: DecoratorContext, target: Model, path: string) {
  _sourceRest.$decorator(ctx, target, path);
}
export function $paginated(ctx: DecoratorContext, target: Model) {
  _sourcePaginated.$decorator(ctx, target);
}
export function $nested(ctx: DecoratorContext, target: Model, parent: Model, path: string) {
  const map: Map<string, NestedDef> = ctx.program.stateMap(SOURCE_NESTED_KEY) as any;
  map.set(target.name, { parent: parent.name, path });
}
export function $pollInterval(ctx: DecoratorContext, target: Model, seconds: number) {
  _sourcePollInterval.$decorator(ctx, target, seconds);
}
export function $freshness(ctx: DecoratorContext, target: Model, kind: string) {
  _sourceFreshness.$decorator(ctx, target, kind);
}

export const isSourceGraphql = _sourceGraphql.has;
export const getSourceRest = _sourceRest.get;
export const hasSourceRest = _sourceRest.has;
export const isSourcePaginated = _sourcePaginated.has;
export const getSourcePollInterval = _sourcePollInterval.get;
export const hasSourcePollInterval = _sourcePollInterval.has;
export const getSourceFreshness = _sourceFreshness.get;
export const hasSourceFreshness = _sourceFreshness.has;

export function getSourceNested(program: Program, modelName: string): NestedDef | undefined {
  return (program.stateMap(SOURCE_NESTED_KEY) as any).get(modelName);
}

export function getAllSourceNested(program: Program): Map<string, NestedDef> {
  return program.stateMap(SOURCE_NESTED_KEY) as any;
}

// ──────────────────────────────────────────────────────────
// Sync namespace
// ──────────────────────────────────────────────────────────

const _syncStrategy = valueDec<string>(BindingCoreStateKeys.syncStrategy as any);

export function $strategy(ctx: DecoratorContext, target: Model, value: string) {
  _syncStrategy.$decorator(ctx, target, value);
}

export const getSyncStrategy = _syncStrategy.get;
export const hasSyncStrategy = _syncStrategy.has;

// ──────────────────────────────────────────────────────────
// Config namespace
// ──────────────────────────────────────────────────────────

const _configSource = flagDec(BindingCoreStateKeys.configSource as any);
const _configEnv = valueDec<string>(BindingCoreStateKeys.configEnv as any);
const _configSecret = flagDec(BindingCoreStateKeys.configSecret as any);
const _configPath = valueDec<string>(BindingCoreStateKeys.configPath as any);

export function $source(ctx: DecoratorContext, target: Model) {
  _configSource.$decorator(ctx, target);
}
export function $envVar(ctx: DecoratorContext, target: ModelProperty, name: string) {
  _configEnv.$decorator(ctx, target, name);
}
export function $secret(ctx: DecoratorContext, target: ModelProperty) {
  _configSecret.$decorator(ctx, target);
}
export function $path(ctx: DecoratorContext, target: Model, pattern: string) {
  _configPath.$decorator(ctx, target, pattern);
}

export const isConfigSource = _configSource.has;
export const getConfigEnv = _configEnv.get;
export const hasConfigEnv = _configEnv.has;
export const isConfigSecret = _configSecret.has;
export const getConfigPath = _configPath.get;
export const hasConfigPath = _configPath.has;

// ──────────────────────────────────────────────────────────
// Cli namespace
// ──────────────────────────────────────────────────────────

const _cliCommand = flagDec(BindingCoreStateKeys.cliCommand as any);
const _cliFlag = flagDec(BindingCoreStateKeys.cliFlag as any);
const _cliArg = valueDec<number>(BindingCoreStateKeys.cliArg as any);
const _cliShort = valueDec<string>(BindingCoreStateKeys.cliShort as any);
const _cliAbout = valueDec<string>(BindingCoreStateKeys.cliAbout as any);

const CLI_SUBCOMMAND_KEY = Symbol.for("hafley:cli-subcommand");

export interface SubcommandDef {
  parent: string;
}

export function $command(ctx: DecoratorContext, target: Model) {
  _cliCommand.$decorator(ctx, target);
}
export function $subcommand(ctx: DecoratorContext, target: Model, parent: Model) {
  const map: Map<string, SubcommandDef> = ctx.program.stateMap(CLI_SUBCOMMAND_KEY) as any;
  map.set(target.name, { parent: parent.name });
}
export function $cliFlag(ctx: DecoratorContext, target: ModelProperty) {
  _cliFlag.$decorator(ctx, target);
}
export function $cliArg(ctx: DecoratorContext, target: ModelProperty, position: number) {
  _cliArg.$decorator(ctx, target, position);
}
export function $short(ctx: DecoratorContext, target: ModelProperty, char: string) {
  _cliShort.$decorator(ctx, target, char);
}
export function $about(ctx: DecoratorContext, target: Model | ModelProperty, text: string) {
  _cliAbout.$decorator(ctx, target, text);
}

export const isCliCommand = _cliCommand.has;
export const isCliFlag = _cliFlag.has;
export const getCliArg = _cliArg.get;
export const hasCliArg = _cliArg.has;
export const getCliShort = _cliShort.get;
export const hasCliShort = _cliShort.has;
export const getCliAbout = _cliAbout.get;
export const hasCliAbout = _cliAbout.has;

export function getCliSubcommand(program: Program, modelName: string): SubcommandDef | undefined {
  return (program.stateMap(CLI_SUBCOMMAND_KEY) as any).get(modelName);
}

// ──────────────────────────────────────────────────────────
// Http namespace
// ──────────────────────────────────────────────────────────

const _httpRouter = flagDec(BindingCoreStateKeys.httpRouter as any);

const HTTP_ROUTE_KEY = Symbol.for("hafley:http-route");
const HTTP_STATE_KEY = Symbol.for("hafley:http-state");

export interface HttpRouteDef {
  method: "get" | "post" | "put" | "delete";
  path: string;
}

export function $router(ctx: DecoratorContext, target: Model) {
  _httpRouter.$decorator(ctx, target);
}

function storeRoute(ctx: DecoratorContext, target: ModelProperty, method: HttpRouteDef["method"], path: string) {
  const map: Map<string, HttpRouteDef[]> = ctx.program.stateMap(HTTP_ROUTE_KEY) as any;
  const modelName = getParentModelName(target);
  if (!map.has(modelName)) map.set(modelName, []);
  map.get(modelName)!.push({ method, path });
}

export function $get(ctx: DecoratorContext, target: ModelProperty, path: string) {
  storeRoute(ctx, target, "get", path);
}
export function $post(ctx: DecoratorContext, target: ModelProperty, path: string) {
  storeRoute(ctx, target, "post", path);
}
export function $put(ctx: DecoratorContext, target: ModelProperty, path: string) {
  storeRoute(ctx, target, "put", path);
}
// $delete conflicts with JS, use $httpDelete internally
export function $httpDelete(ctx: DecoratorContext, target: ModelProperty, path: string) {
  storeRoute(ctx, target, "delete", path);
}
export function $state(ctx: DecoratorContext, target: Model, config: Model) {
  const map: Map<string, string> = ctx.program.stateMap(HTTP_STATE_KEY) as any;
  map.set(target.name, config.name);
}

export const isHttpRouter = _httpRouter.has;

export function getHttpRoutes(program: Program, modelName: string): HttpRouteDef[] | undefined {
  return (program.stateMap(HTTP_ROUTE_KEY) as any).get(modelName);
}

export function getHttpState(program: Program, modelName: string): string | undefined {
  return (program.stateMap(HTTP_STATE_KEY) as any).get(modelName);
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
    default: $default,
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
  Source: {
    graphql: $graphql,
    rest: $rest,
    paginated: $paginated,
    nested: $nested,
    pollInterval: $pollInterval,
    freshness: $freshness,
  },
  Sync: {
    strategy: $strategy,
  },
  Config: {
    source: $source,
    envVar: $envVar,
    secret: $secret,
    path: $path,
  },
  Cli: {
    command: $command,
    subcommand: $subcommand,
    cliFlag: $cliFlag,
    cliArg: $cliArg,
    short: $short,
    about: $about,
  },
  Http: {
    router: $router,
    get: $get,
    post: $post,
    put: $put,
    httpDelete: $httpDelete,
    state: $state,
  },
};
