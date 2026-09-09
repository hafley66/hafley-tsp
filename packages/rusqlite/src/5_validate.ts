import { writeOutput } from "@alloy-js/core";
import type { Program } from "@typespec/compiler";
import { autoFile, emitSQLFromStorage, loadedAutoEmitters } from "@hafley/typespec-sql";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { reportRusqliteDiagnostic } from "./0_lib.js";
import { rusqliteStorage } from "./3_storage.js";
import { emitRusqliteRustFromStorage } from "./4_emit.js";

export async function $onValidate(program: Program) {
  const owners = loadedAutoEmitters(program);
  if (owners.length > 1) {
    reportRusqliteDiagnostic(program, {
      code: "conflicting-auto-emitters",
      target: program.getGlobalNamespaceType(),
      format: { owners: owners.join(", ") },
    });
    return;
  }
  if (program.hasError()) return;
  const outputDirectory = join(program.projectRoot ?? ".", "tsp-output");
  const existingRust = join(outputDirectory, "generated.rs");
  let storage;
  try {
    storage = rusqliteStorage(program, { existingFile: existingRust });
  } catch (error) {
    reportRusqliteDiagnostic(program, {
      code: "invalid-rusqlite",
      target: program.getGlobalNamespaceType(),
      format: { reason: error instanceof Error ? error.message : String(error) },
    });
    return;
  }
  if (program.compilerOptions.noEmit) return;
  const sql = emitSQLFromStorage(program, storage.interned, storage.dialect);
  const sqlContent = autoFile(program, storage.sourceTypes, sql, existingRust, "schema_auto.sql", "--");
  const rust = emitRusqliteRustFromStorage(storage, existingRust);
  await mkdir(outputDirectory, { recursive: true });
  await Promise.all([
    ...(sqlContent === undefined ? [] : [writeFile(join(outputDirectory, "schema_auto.sql"), sqlContent)]),
    writeOutput(rust, outputDirectory),
  ]);
}
