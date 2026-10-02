// Coordinator-only gate. This script emits fixtures through the built emitter.
import { compile, NodeHost } from "@typespec/compiler";
import { programToOps } from "@hafley/emit-helper/http";
import { emitC, emitCli, emitStore, writeC } from "../dist/index.js";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const slice = process.env.BOOP_C_SLICE ?? "/Users/chrishafley/projects/boop2/.boop-worktrees/c/first-slice";
const vendor = join(slice, "impl/c/vendor");
const out = process.env.C_FIXTURE_OUTPUT ? resolve(process.env.C_FIXTURE_OUTPUT) : mkdtempSync(join(tmpdir(), "alloy-c-fixtures-"));
const run = args => execFileSync("zig", ["cc", ...args], { stdio: "inherit" });
const flags = ["-std=c11", "-Wall", "-Wextra", "-Werror", "-Wswitch-enum", "-D_DARWIN_C_SOURCE", "-I", join(vendor, "mimalloc/include"), "-I", join(vendor, "yyjson")];
try {
  mkdirSync(out, { recursive: true });
  const mimalloc = join(out, "mimalloc.o"), yyjson = join(out, "yyjson.o");
  run([...flags, "-DMI_STATIC_LIB", "-DMI_SECURE=0", "-c", join(vendor, "mimalloc/src/static.c"), "-o", mimalloc]);
  run([...flags, "-c", join(vendor, "yyjson/yyjson.c"), "-o", yyjson]);
  for (const emitter of ["store", "wire", "cli"]) {
    const fixture = fileURLToPath(new URL(`./fixtures/${emitter}/main.tsp`, import.meta.url));
    const program = await compile(NodeHost, fixture, { noEmit: true });
    if (program.hasError()) throw new Error(program.diagnostics.map(d => d.message).join("\n"));
    const files = emitter === "store" ? emitStore(program) : emitter === "wire" ? emitC(program, { wire: true }) : emitCli(programToOps(program));
    const target = join(out, emitter);
    writeC(program, files, target);
    const objects = [];
    for (const file of files.filter(f => f.path.endsWith(".c"))) {
      const object = join(target, `${file.path}.o`);
      mkdirSync(dirname(object), { recursive: true });
      run([...flags, "-I", target, "-c", join(target, file.path), "-o", object]);
      objects.push(object);
    }
    const executable = join(target, "roundtrip");
    run([...flags, "-I", target, join(dirname(fixture), "1_roundtrip.c"), ...objects, mimalloc, ...(emitter === "wire" ? [yyjson] : []), "-lsqlite3", "-o", executable]);
    execFileSync(executable, [], { stdio: "inherit" });
  }
} finally {
  if (!process.env.C_FIXTURE_OUTPUT) rmSync(out, { recursive: true, force: true });
}
