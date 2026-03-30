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
} from "./decorators.js";
export { extractFacts, type FactDB } from "./2_facts.js";
export { emitSQL } from "./4_emit-sql.js";
export { emitRust } from "./5_emit-rust.js";
