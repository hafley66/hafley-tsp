import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { compile, NodeHost, formatDiagnostic } from "@typespec/compiler";
import { writeOutput } from "@alloy-js/core";
import { emitSQL, emitRust, emitGo, internStorage } from "../dist/src/index.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const scratch = await mkdtemp(join(tmpdir(), "binding-core-intern-"));
let serial = 0;
async function program(source, noEmit = true) {
  const dir = join(scratch, String(serial++));
  await mkdir(dir);
  const file = join(dir, "main.tsp");
  await writeFile(file, `import ${JSON.stringify(join(root, "lib/main.tsp"))};\n${source}`);
  return compile(NodeHost, file, { noEmit });
}
function clean(p) { assert.deepEqual(p.diagnostics.map(d => formatDiagnostic(d)), []); }

test("shared lowering preserves authored types and resolves domains, inheritance and keys", async () => {
  const p = await program(await readFile(join(root, "tests/0_intern.tsp"), "utf8"));
  clean(p);
  const plan = internStorage(p);
  assert.deepEqual(plan.domains.map(d => d.table), ["Symbol", "Path"]);
  assert.deepEqual(plan.entities.map(e => [e.table, e.fields.map(f => [f.name, f.column, f.domain?.table ?? null, f.nullable]), e.unique, e.indexes]), [
    ["Link", [["id","id",null,false],["caller","caller_id","Symbol",false],["callee","callee_id","Symbol",false],["label","label",null,true],["path","path_id","Path",true],["alias","alias_id","Symbol",true]], [["caller_id","callee_id"]], [["callee_id"]]],
    ["Pair", [["key","key",null,false],["left","left_id","Symbol",false],["right","right_id","Symbol",false]], [["left_id","right_id"]], []],
    ["Bare", [["value","value_id","Symbol",false]], [], []],
    ["Scoped", [["id","id",null,false],["scope","scope_id",null,false],["name","name_id","Symbol",false]], [["scope_id","name_id"]], []],
    ["Names", [["conn","conn_id","Symbol",false],["tx","tx",null,false],["inserted","inserted",null,false],["type","type",null,false]], [], []],
  ]);
  assert.equal(p.getGlobalNamespaceType().models.get("Link").properties.get("caller").type.name, "Symbol");
  assert.equal(emitSQL(p), emitSQL(p));
  assert.throws(() => emitGo(p), /Go writer generation is not supported/);
});

test("invalid declarations fail during compile without publishing output", async () => {
  for (const source of [
    "@Entity.intern scalar Bad extends int32;",
    "@Entity.intern model Bad {}",
    "@Entity.intern scalar S extends string; model M { a: S[]; }",
    "@Entity.intern scalar S extends string; model M { a: S | int32; }",
    "@Entity.intern scalar S extends string; model M { a: S; a_id: int32; }",
    "@Entity.intern scalar S extends string; model M { @Entity.pk a: S; }",
    "@Entity.intern scalar S extends string; model M { @Entity.default(\"'x'\") a: S; }",
    "@Entity.intern scalar S extends string; model M { a: S; } model M_text { @Entity.pk id: integer; }",
    "namespace A { @Entity.intern scalar S extends string; } @Entity.intern scalar A__S extends string; model M { a: A.S; b: A__S; }",
  ]) {
    const p = await program(source, false);
    assert.ok(p.hasError(), source);
    await assert.rejects(stat(join(p.projectRoot, "tsp-output")), { code: "ENOENT" });
  }
});

test("qualified scalar domains and inherited model properties remain distinct", async () => {
  const p = await program("namespace A { @Entity.intern scalar S extends string; } namespace B { @Entity.intern scalar S extends string; } model Base { a: A.S; } model Child extends Base { b: B.S; }");
  clean(p);
  const plan = internStorage(p);
  assert.deepEqual(plan.domains.map(d => d.table).sort(), ["A__S", "B__S"]);
  assert.deepEqual(plan.entities.find(e => e.table === "Child").fields.map(f => f.name).sort(), ["a", "b"]);
  assert.match(emitSQL(p), /REFERENCES "A__S"\(id\)/);
  assert.match(emitSQL(p), /REFERENCES "B__S"\(id\)/);
});

test("existing unannotated entity SQL retains its contract", async () => {
  const p = await program("model Ordinary { @Entity.pk id: integer; label: string; }");
  clean(p);
  assert.equal(emitSQL(p), "CREATE TABLE IF NOT EXISTS ordinary (\n    id INTEGER PRIMARY KEY AUTOINCREMENT,\n    label TEXT NOT NULL\n);\n\n");
  await assert.rejects(stat(join(p.projectRoot, "tsp-output")), { code: "ENOENT" });
});

test("normal compile publishes SQL/Rust auto files and preserves unchanged auto bodies", async () => {
  const p = await program("@Entity.intern scalar S extends string; model E { value: S; }", false);
  clean(p);
  const out = join(p.projectRoot, "tsp-output");
  assert.match(await readFile(join(out, "schema_auto.sql"), "utf8"), /CREATE TABLE IF NOT EXISTS "S"/);
  assert.match(await readFile(join(out, "generated.rs"), "utf8"), /pub mod intern_auto;/);
  const before = await stat(join(out, "intern_auto.rs"));
  const sqlBefore = await stat(join(out, "schema_auto.sql"));
  const repeated = await compile(NodeHost, join(p.projectRoot, "main.tsp"), { noEmit: false });
  clean(repeated);
  assert.equal((await stat(join(out, "intern_auto.rs"))).mtimeMs, before.mtimeMs);
  assert.equal((await stat(join(out, "schema_auto.sql"))).mtimeMs, sqlBefore.mtimeMs);
  await assert.rejects(stat(join(out, "generated.go")), { code: "ENOENT" });
});

test("generated Rust compiles and executes against SQLite", { timeout: 300_000 }, async () => {
  const p = await program(await readFile(join(root, "tests/0_intern.tsp"), "utf8"));
  clean(p);
  const dir = join(scratch, "rust");
  await mkdir(join(dir, "src"), { recursive: true });
  await writeOutput(emitRust(p), dir);
  const before = await stat(join(dir, "intern_auto.rs"));
  const generated = await readFile(join(dir, "intern_auto.rs"), "utf8");
  assert.match(generated, /\/\/ Input SHA-256: [a-f0-9]{64}/);
  await writeOutput(emitRust(p, join(dir, "generated.rs")), dir);
  assert.equal((await stat(join(dir, "intern_auto.rs"))).mtimeMs, before.mtimeMs);
  await writeFile(join(dir, "schema_auto.sql"), emitSQL(p));
  await writeFile(join(dir, "src/lib.rs"), await readFile(join(root, "tests/1_intern.rs")));
  await writeFile(join(dir, "intern_golden.txt"), await readFile(join(root, "tests/1_intern_golden.txt")));
  await writeFile(join(dir, "Cargo.toml"), `[package]\nname="intern-emitter-test"\nversion="0.0.0"\nedition="2021"\n[workspace]\n[dependencies]\nanyhow="1"\nserde={version="1",features=["derive"]}\nsqlx={version="=0.8.6",default-features=false,features=["runtime-tokio","sqlite"]}\ntokio={version="1",features=["macros","rt-multi-thread"]}\n[profile.dev]\ndebug=0\nincremental=false\n`);
  const result = await new Promise((done, reject) => {
    const child = spawn("cargo", ["test", "--offline", "--quiet", "--manifest-path", join(dir, "Cargo.toml")], {
      stdio: "inherit", env: { ...process.env, INTERN_TEST_DATABASE: join(dir, "test.db"), CARGO_TARGET_DIR: process.env.BINDING_CORE_CARGO_TARGET ?? resolve(root, "target/intern-tests") },
    });
    child.on("error", reject);
    child.on("close", done);
  });
  assert.equal(result, 0);
});
