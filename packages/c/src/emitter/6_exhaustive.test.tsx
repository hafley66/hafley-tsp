import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compile, NodeHost } from "@typespec/compiler";
import { expect, it } from "vitest";
import { emitC } from "./2_emit.js";
import { writeC } from "./3_write.js";

it.each(['enum State { first, second', 'union State { first: int64, second: string'])("requires new callbacks after a variant is added: %s", async (source) => {
  const out = mkdtempSync(join(tmpdir(),"alloy-c-exhaustive-"));
  try {
    const tsp = join(out,"main.tsp");
    const c = join(out,"manual.c");
    writeFileSync(tsp,source+' }');
    const program = await compile(NodeHost,tsp,{noEmit:true});
    expect(program.diagnostics).toEqual([]);
    writeC(program,emitC(program),out);
    writeFileSync(c,'#include "State_auto.h"\nState_cases callbacks(void) { return State_cases_init(NULL, NULL); }\n');
    const mi = execFileSync("brew",["--prefix","mimalloc"],{encoding:"utf8"}).trim();
    const args = ['cc','-std=c11','-Wall','-Wextra','-Werror','-I',join(mi,'include'),'-c',c,'-o',join(out,'manual.o')];
    execFileSync('zig',args,{stdio:'pipe'});
    writeFileSync(tsp,source+(source.startsWith('union')?', third: boolean }':', third }'));
    const updated = await compile(NodeHost,tsp,{noEmit:true});
    expect(updated.diagnostics).toEqual([]);
    writeC(updated,emitC(updated),out);
    const result = spawnSync('zig',args,{encoding:'utf8'});
    expect({status:result.status,missingCase:result.stderr.includes('too few arguments provided to function-like macro invocation')}).toMatchSnapshot();
  } finally {rmSync(out,{recursive:true,force:true});}
},30_000);
