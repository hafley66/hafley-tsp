// $onValidate -- runs after all types are checked.
// Builds facts.json from extractFacts (for debug/external consumers),
// then passes program directly to emitters (they walk the graph themselves).

import type { Program } from "@typespec/compiler";
import { extractFacts } from "./2_facts.js";
import { emitSQL } from "./4_emit-sql.js";
import { emitRust } from "./5_emit-rust.js";
import { emitGo } from "./6_emit-go.js";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function $onValidate(program: Program) {
  const facts = extractFacts(program);
  const sql = emitSQL(program);
  const existingRs = join(program.projectRoot ?? ".", "tsp-output", "generated.rs");
  const rust = emitRust(program, existingRs);
  const go = emitGo(program);

  console.log(
    `\n  binding-core: ${facts.entities.length} entities, ` +
      `${facts.fields.length} fields, ` +
      `${facts.relations.length} relations, ` +
      `${facts.bindings.length} bindings, ` +
      `${facts.sources.length} sources`,
  );

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
