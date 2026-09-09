// $onValidate -- runs after all types are checked.
// Passes program directly to emitters (they walk the graph themselves).

import type { Program } from "@typespec/compiler";
import { writeOutput } from "@alloy-js/core";
import { collectModels, isEntityModel } from "./2_facts.js";
import { hasBinding, getAllRelations, isSourceGraphql, hasSourceRest } from "./decorators.js";
import { emitSQLFromStorage } from "@hafley/typespec-sql";
import { emitRust } from "./5_emit-rust.js";
import { emitGo } from "./6_emit-go.js";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { internStorage } from "./2a_intern.js";
import { reportDiagnostic } from "./lib.js";
import { internAutoFile } from "./4a_emit_intern.js";
import { loadedAutoEmitters } from "@hafley/typespec-sqlx";

export async function $onValidate(program: Program) {
  const owners = loadedAutoEmitters(program);
  if (owners.length > 1) {
    reportDiagnostic(program, {
      code: "conflicting-auto-emitters",
      target: program.getGlobalNamespaceType(),
      format: { owners: owners.join(", ") },
    });
    return;
  }
  if (program.hasError()) return;
  let interned;
  try { interned = internStorage(program); }
  catch (error) {
    reportDiagnostic(program, { code: "invalid-intern", target: program.getGlobalNamespaceType(), format: { reason: String(error) } });
    return;
  }
  if (program.compilerOptions.noEmit) return;
  const allModels = collectModels(program.getGlobalNamespaceType());
  const entities = allModels.filter(m => isEntityModel(program, m) || interned.entities.some(e => e.model === m));
  const relMap = getAllRelations(program);
  const bindings = allModels.filter(m => hasBinding(program, m));
  const sources = allModels.filter(m => isSourceGraphql(program, m) || hasSourceRest(program, m));
  const fieldCount = entities.reduce((n, m) => n + m.properties.size, 0);
  const relCount = [...relMap.values()].reduce((n, rels) => n + rels.length, 0);

  console.log(
    `\n  binding-core: ${entities.length} entities, ` +
      `${fieldCount} fields, ` +
      `${relCount} relations, ` +
      `${bindings.length} bindings, ` +
      `${sources.length} sources, ${interned.domains.length} intern dictionaries`,
  );

  const outputDir = join(program.projectRoot ?? ".", "tsp-output");
  await mkdir(outputDir, { recursive: true });

  const sql = emitSQLFromStorage(program, interned);
  const sqlFile = interned.entities.length ? "schema_auto.sql" : "schema.sql";
  const existingRs = join(outputDir, "generated.rs");
  const sqlContent = interned.entities.length ? internAutoFile(program, interned, sql, existingRs, sqlFile, "--") : sql;
  const rustOutput = emitRust(program, existingRs);
  const goOutput = interned.entities.length ? undefined : emitGo(program);

  await Promise.all([
    ...(sqlContent === undefined ? [] : [writeFile(join(outputDir, sqlFile), sqlContent)]),
    writeOutput(rustOutput, outputDir),
    ...(goOutput ? [writeOutput(goOutput, outputDir)] : []),
  ]);

  console.log(`  binding-core: wrote ${sqlFile}, generated.rs, ${goOutput ? "generated.go" : "intern_auto.rs (Go interning unsupported)"} to ${outputDir}\n`);
}
