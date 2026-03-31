export { $lib } from "./lib.js";
export { BindingCoreStateKeys, reportDiagnostic, createDiagnostic } from "./lib.js";
export {
  $decorators,
  isPk,
  isManual,
  getUnique,
  getIndex,
  getDefault,
  hasDefault,
  getBinding,
  hasBinding,
  getRelations,
  isSourceGraphql,
  getSourceRest,
  hasSourceRest,
  isSourcePaginated,
  getSourcePollInterval,
  getSourceNested,
  getSyncStrategy,
  hasSyncStrategy,
  type RelationDef,
  type BindingDef,
  type NestedDef,
  // Config
  isConfigSource,
  hasConfigEnv, getConfigEnv,
  isConfigSecret,
  hasConfigPath,
  getConfigPath,
  // Cli
  isCliCommand,
  isCliFlag,
  hasCliArg,
  getCliArg,
  hasCliShort,
  getCliShort,
  hasCliAbout,
  getCliAbout,
  getCliSubcommand,
  type SubcommandDef,
  // Http
  isHttpRouter,
  getHttpRoutes,
  getHttpState,
  type HttpRouteDef,
} from "./decorators.js";
export {
  resolveFieldType, resolveScalarName, resolvedFields, collectModels, isEntityModel,
  snakeCase, resolveRelTarget, extractChain,
  type ResolvedField,
} from "./2_facts.js";
export { emitSQL } from "./4_emit-sql.js";
export { emitRust } from "./5_emit-rust.js";
export { emitGo } from "./6_emit-go.js";
