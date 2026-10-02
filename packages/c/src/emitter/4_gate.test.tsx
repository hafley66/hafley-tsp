import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, statSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { compile, NodeHost } from "@typespec/compiler";
import { expect, it } from "vitest";
import { emitC } from "./2_emit.js";
import { writeC } from "./3_write.js";

it.runIf(process.env.C_GATE === "1").each([false, true])("compiles C files and runs arena round trips (boop2=%s)", async (boop) => {
  const schema = process.env.BOOP_SCHEMA ?? "/Users/chrishafley/projects/boop2/schema";
  const out = mkdtempSync(join(tmpdir(), "alloy-c-"));
  try {
    const fixture = new URL("../../test/fixtures/0_types.tsp", import.meta.url).pathname;
    const entry = join(out, "main.tsp");
    writeFileSync(entry, (boop ? [join(schema,"0_ids.tsp"),join(schema,"1_enums.tsp"),fixture] : [fixture]).map(p => `import ${JSON.stringify(p)};`).join("\n"));
    const program = await compile(NodeHost, entry, { noEmit: true });
    expect(program.diagnostics).toEqual([]);
    const files = emitC(program);
    expect(files).toMatchSnapshot();
    writeC(program, files, out);
    const manual = join(out,"Probe/Result.c");
    writeFileSync(manual, "/* manual body */\n");
    const before = files.map(f => statSync(join(out,f.path)).mtimeMs);
    writeC(program,files,out);
    expect(files.map(f => statSync(join(out,f.path)).mtimeMs)).toEqual(before);
    expect(readFileSync(manual,"utf8")).toBe("/* manual body */\n");
    const mi = execFileSync("brew", ["--prefix","mimalloc"], {encoding:"utf8"}).trim();
    const flags = [...(boop ? ["-DBOOP_GATE"] : []),"-std=c11","-Wall","-Wextra","-Werror","-Wswitch-enum","-I",join(mi,"include"),"-I",out];
    const sources = files.filter(f => f.path.endsWith(".c"));
    const objects: string[] = [];
    for (const file of sources) {
      const object = join(out,file.path + ".o");
      execFileSync("zig", ["cc",...flags,"-c",join(out,file.path),"-o",object],{stdio:"pipe"});
      if (file.path.startsWith("Probe/") || file.path === "Boop/Acp/channel/Delivery_auto.c") objects.push(object);
    }
    const executable = join(out,"roundtrip");
    execFileSync("zig",["cc",...flags,new URL("../../test/fixtures/1_roundtrip.c",import.meta.url).pathname,...objects,"-L",join(mi,"lib"),"-Wl,-rpath,"+join(mi,"lib"),"-lmimalloc","-o",executable],{stdio:"pipe"});
    execFileSync(executable,[],{stdio:"pipe"});
    // Retain inspectable output when explicitly requested by the test runner.
    if (process.env.C_GATE_OUTPUT) {
      const target = resolve(process.env.C_GATE_OUTPUT, boop ? "boop2" : "fixture");
      writeC(program, files, target);
      mkdirSync(dirname(join(target,"gate.json")),{recursive:true});
      writeFileSync(join(target,"gate.json"), JSON.stringify({ declarations: sources.length, files: files.length,
        headerLines: files.filter(f => f.path.endsWith(".h")).reduce((n,f)=>n+f.contents.split("\n").length-1,0),
        sourceLines: sources.reduce((n,f)=>n+f.contents.split("\n").length-1,0), compiler:"zig cc -std=c11 -Wall -Wextra -Werror -Wswitch-enum", roundtrip:0 },null,2)+"\n");
    }
  } finally { rmSync(out,{recursive:true,force:true}); }
}, 120_000);
