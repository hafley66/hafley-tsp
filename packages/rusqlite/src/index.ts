export { $lib, reportRusqliteDiagnostic, createRusqliteDiagnostic } from "./0_lib.js";
export { validateRusqliteStorage, type RusqliteStrategy } from "./1_validate.js";
export { emitWriteConnectionTrait, emitInternRusqlite } from "./2_intern_writer.js";
export {
  RUSQLITE_RUST_TYPE,
  rusqliteRustType,
  rusqliteRustIdent,
  rusqliteRowName,
  rusqliteRowType,
  rusqliteStorage,
  emitRusqliteWriter,
  RusqliteRowStructs,
  type RusqliteStorageOptions,
  type RusqliteStorageParts,
} from "./3_storage.js";
export { emitRusqliteValueWriters, type RusqliteValueWriterOptions } from "./3a_value_writer.js";
export {
  emitRusqliteTaggedRowWriter,
  type RusqliteTaggedRowWriterOptions,
  type RusqliteTaggedSourceField,
} from "./3b_tagged_row_writer.js";
export { emitRusqliteRust, emitRusqliteRustFromStorage } from "./4_emit.js";
