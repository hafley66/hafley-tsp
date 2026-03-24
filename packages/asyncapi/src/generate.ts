/**
 * Generates decorators.tsp and decorators.ts from decorator-spec.ts.
 *
 * Usage: npx tsx src/generate.ts
 */

import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { generateTsp, generateTs } from "./decorator-codegen.js";
import { asyncapiSpec } from "./decorator-spec.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const tsp = generateTsp(asyncapiSpec);
const ts = generateTs(asyncapiSpec, "AsyncApiStateKeys");

writeFileSync(resolve(root, "lib/decorators.tsp"), tsp);
writeFileSync(resolve(root, "src/decorators.ts"), ts);

console.log("Generated lib/decorators.tsp and src/decorators.ts from decorator-spec.ts");
