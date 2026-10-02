import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { emitFile, getSourceLocation, type EmitContext, type Program } from "@typespec/compiler";
import { declarations } from "./0_types.js";
import { emitStore } from "./4_store.js";
import { emitC, type CFile } from "./2_emit.js";

function preamble(program: Program, files: CFile[]): string {
  const sources = [...new Set(declarations(program).map(t => getSourceLocation(t).file.path))].sort();
  const hash = createHash("sha256");
  for (const path of sources) hash.update(path).update(program.sourceFiles.get(path)!.file.text);
  // Include the rendered bodies so generator changes invalidate the fast path.
  for (const file of files) hash.update(file.path).update(file.contents);
  return `/* alloy-c generated\n * Rendered: ${new Date().toISOString()}\n * Inputs: ${hash.digest("hex")}\n * Sources:\n${sources.map(s => ` * ${s.replaceAll("*/", "* /")}\n`).join("")} */\n`;
}
function body(contents: string): string {
  return contents.replace(/^\/\* alloy-c generated\n[\s\S]*? \*\/\n/, "");
}
function unchanged(previous: string | undefined, prefix: string, next: string): boolean {
  if (previous === undefined) return false;
  const hash = (text: string) => text.match(/^ \* Inputs: ([a-f0-9]+)$/m)?.[1];
  return hash(previous) === hash(prefix) || body(previous) === next;
}
function oldContents(path: string): string | undefined {
  try { return readFileSync(path, "utf8"); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined; throw error; }
}
export function writeC(program: Program, files: CFile[], outputDir: string): void {
  const prefix = preamble(program, files);
  for (const file of files) {
    if (!/^[A-Za-z0-9_\/]+_auto\.[hc]$/.test(file.path)) throw new Error(`Refusing manual output: ${file.path}`);
    const path = resolve(outputDir, file.path);
    const previous = oldContents(path);
    if (unchanged(previous, prefix, file.contents)) continue;
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, prefix + file.contents);
  }
}
export async function $onEmit(context: EmitContext): Promise<void> {
  if (context.program.compilerOptions.noEmit || context.program.hasError()) return;
  const files = [...emitC(context.program, { wire: true }), ...emitStore(context.program)];
  const prefix = preamble(context.program, files);
  for (const file of files) {
    const path = resolve(context.emitterOutputDir, file.path);
    let previous: string | undefined;
    try { previous = (await context.program.host.readFile(path)).text; }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    if (unchanged(previous, prefix, file.contents)) continue;
    await emitFile(context.program, { path, content: prefix + file.contents });
  }
}
