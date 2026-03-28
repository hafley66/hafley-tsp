import { compile, NodeHost } from "@typespec/compiler";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname!, "..");
const mainTsp = resolve(root, "packages/asyncapi/lib/main.tsp");

const program = await compile(NodeHost, mainTsp, { noEmit: true });

// Show diagnostics with file locations
if (program.diagnostics.length > 0) {
  console.log("=== Diagnostics ===");
  for (const d of program.diagnostics) {
    const loc = d.target && typeof d.target === "object" && "file" in d.target
      ? `${(d.target as any).file?.path ?? "?"}:${(d.target as any).pos ?? "?"}`
      : JSON.stringify(d.target);
    console.log(`  [${d.severity}] ${d.code}: ${d.message}`);
    console.log(`    at: ${loc}`);
  }
}

const globalNs = program.getGlobalNamespaceType();
const asyncNs = globalNs.namespaces.get("AsyncAPI")!;

console.log("\n=== Models ===");
for (const [name, model] of asyncNs.models) {
  console.log(`${name}: ${model.properties.size} props [${[...model.properties.keys()]}]`);
}
