// $onValidate -- runs after all types are checked.
// Extracts fact tables from decorator state, writes facts.json + schema.sql to tsp-output/.

import type { Program } from "@typespec/compiler";
import { extractFacts } from "./2_facts.js";
import { emitSQL } from "./4_emit-sql.js";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export async function $onValidate(program: Program) {
  const facts = extractFacts(program);
  const sql = emitSQL(facts);

  // Print summary
  console.log(
    `\n  binding-core: ${facts.entities.length} entities, ` +
      `${facts.fields.length} fields, ` +
      `${facts.relations.length} relations, ` +
      `${facts.bindings.length} bindings`,
  );

  // Write outputs
  const outputDir = join(program.projectRoot ?? ".", "tsp-output");
  await mkdir(outputDir, { recursive: true });

  await Promise.all([
    writeFile(join(outputDir, "facts.json"), JSON.stringify(facts, null, 2)),
    writeFile(join(outputDir, "schema.sql"), sql),
  ]);

  console.log(`  binding-core: wrote ${outputDir}/facts.json`);
  console.log(`  binding-core: wrote ${outputDir}/schema.sql\n`);
}
