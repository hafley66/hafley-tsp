// $onValidate -- runs after all types are checked.
// Extracts fact tables from decorator state, writes facts.json + schema.sql to tsp-output/.

import type { Program } from "@typespec/compiler";
import { extractFacts } from "./2_facts.js";
import { emitSQL } from "./4_emit-sql.js";
import { emitRust } from "./5_emit-rust.js";
import { emitGo } from "./6_emit-go.js";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function $onValidate(program: Program) {
  const facts = extractFacts(program);
  const sql = emitSQL(facts);
  const existingRs = join(program.projectRoot ?? ".", "tsp-output", "generated.rs");
  const rust = emitRust(facts, existingRs);
  const go = emitGo(facts);

  // Print summary
  console.log(
    `\n  binding-core: ${facts.entities.length} entities, ` +
      `${facts.fields.length} fields, ` +
      `${facts.relations.length} relations, ` +
      `${facts.bindings.length} bindings, ` +
      `${facts.sources.length} sources`,
  );

  // Write outputs
  const outputDir = join(program.projectRoot ?? ".", "tsp-output");
  await mkdir(outputDir, { recursive: true });

  await Promise.all([
    writeFile(join(outputDir, "facts.json"), JSON.stringify(facts, null, 2)),
    writeFile(join(outputDir, "schema.sql"), sql),
    writeFile(join(outputDir, "generated.rs"), rust),
    writeFile(join(outputDir, "generated.go"), go),
  ]);

  console.log(`  binding-core: wrote facts.json, schema.sql, generated.rs, generated.go to ${outputDir}\n`);
}
