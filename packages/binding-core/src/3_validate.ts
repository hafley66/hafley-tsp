// $onValidate -- runs after all types are checked.
// Passes program directly to emitters (they walk the graph themselves).

import type { Program } from "@typespec/compiler";
import { writeOutput } from "@alloy-js/core";
import { collectModels, isEntityModel } from "./2_facts.js";
import { hasBinding, getAllRelations, isSourceGraphql, hasSourceRest } from "./decorators.js";
import { emitSQL } from "./4_emit-sql.js";
import { emitRust } from "./5_emit-rust.js";
import { emitGo } from "./6_emit-go.js";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function $onValidate(program: Program) {
  const allModels = collectModels(program.getGlobalNamespaceType());
  const entities = allModels.filter(m => isEntityModel(program, m));
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
      `${sources.length} sources`,
  );

  const outputDir = join(program.projectRoot ?? ".", "tsp-output");
  await mkdir(outputDir, { recursive: true });

  const sql = emitSQL(program);
  const existingRs = join(outputDir, "generated.rs");
  const rustOutput = emitRust(program, existingRs);
  const goOutput = emitGo(program);

  await Promise.all([
    writeFile(join(outputDir, "schema.sql"), sql),
    writeOutput(rustOutput, outputDir),
    writeOutput(goOutput, outputDir),
  ]);

  console.log(`  binding-core: wrote schema.sql, generated.rs, generated.go to ${outputDir}\n`);
}
