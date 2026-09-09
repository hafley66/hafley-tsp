import { writeOutput } from "@alloy-js/core";
import type { Program } from "@typespec/compiler";
import { autoFile, emitSQLFromStorage } from "@hafley/typespec-sql";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { reportSqlxDiagnostic } from "./0_lib.js";
import { loadedAutoEmitters } from "./1_validate.js";
import { sqlxStorage } from "./3_storage.js";
import { emitSqlxRustFromStorage } from "./4_emit.js";

export async function $onValidate(program: Program) {
  const owners = loadedAutoEmitters(program);
  if (owners.length > 1) {
    reportSqlxDiagnostic(program, {
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
    storage = sqlxStorage(program, { existingFile: existingRust });
  } catch (error) {
    reportSqlxDiagnostic(program, {
      code: "invalid-sqlx",
      target: program.getGlobalNamespaceType(),
      format: { reason: String(error) },
    });
    return;
  }
  if (program.compilerOptions.noEmit) return;

  const sql = emitSQLFromStorage(program, storage.interned, storage.dialect);
  const sqlContent = autoFile(program, storage.sourceTypes, sql, existingRust, "schema_auto.sql", "--");
  const rust = emitSqlxRustFromStorage(storage, existingRust);
  await mkdir(outputDirectory, { recursive: true });
  await Promise.all([
    ...(sqlContent === undefined ? [] : [writeFile(join(outputDirectory, "schema_auto.sql"), sqlContent)]),
    writeOutput(rust, outputDirectory),
  ]);
}
