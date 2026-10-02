import { compile, NodeHost } from "@typespec/compiler";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { expect, it } from "vitest";
import { emitC } from "./2_emit.js";

it.each([
  ['model Bad { values: string[]; }', 'Anonymous models, arrays and records require a named C representation'],
  ['union Bad { string, int64 }', 'Union Bad requires named variants'],
  ['scalar Bad extends decimal;', 'Unsupported scalar: decimal'],
  ['model Bad { `switch`: string; }', 'Invalid C11 identifier: switch'],
  ['enum Bad { a: 1, b: 1 }', 'Ambiguous enum value: Bad.b'],
  ['model Bad { has_note: boolean; note?: string; }', 'Duplicate C field: Bad.has_note'],
  ['interface Bad { read(arena: int64): void; }', 'Reserved C parameter: Bad.read.arena'],
  ['enum Bad {}', 'Empty enum: Bad'],
])("reports unsupported constructs: %s", async (source, error) => {
  const dir = mkdtempSync(join(tmpdir(),"alloy-c-edge-"));
  try {
    const path = join(dir,"main.tsp");
    writeFileSync(path,source);
    const program = await compile(NodeHost,path,{noEmit:true});
    expect(program.diagnostics).toEqual([]);
    expect(() => emitC(program)).toThrow(error);
  } finally { rmSync(dir,{recursive:true,force:true}); }
});
