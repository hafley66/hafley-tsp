import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeOutput } from "@alloy-js/core";
import { compile, formatDiagnostic, NodeHost } from "@typespec/compiler";
import { internStorage, sqliteDialect } from "@hafley/typespec-sql";
import { emitSqlxRust } from "../../sqlx/dist/src/index.js";
import {
  emitInternRusqlite, emitRusqliteRust, rusqliteRustIdent, rusqliteRustType, rusqliteStorage,
} from "../dist/src/index.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const sqlxRoot = fileURLToPath(new URL("../../sqlx", import.meta.url));
const bindingRoot = fileURLToPath(new URL("../../binding-core", import.meta.url));
const scratch = await mkdtemp(join(tmpdir(), "typespec-rusqlite-hooks-"));
let serial = 0;

async function program(source, imports = [join(root, "lib/main.tsp")], noEmit = true) {
  const directory = join(scratch, String(serial++));
  await mkdir(directory);
  const main = join(directory, "main.tsp");
  await writeFile(main, [...imports.map((path) => `import ${JSON.stringify(path)};`), source].join("\n"));
  return compile(NodeHost, main, { noEmit });
}

function clean(compiled) {
  assert.deepEqual(compiled.diagnostics.map((diagnostic) => formatDiagnostic(diagnostic)), []);
}

test("hook retains unchanged auto-file mtimes and generated manual content", async () => {
  const compiled = await program("@Entity.intern scalar S extends string; model E { value: S; }", undefined, false);
  clean(compiled);
  const output = join(compiled.projectRoot, "tsp-output");
  const internBefore = await stat(join(output, "intern_auto.rs"));
  const sqlBefore = await stat(join(output, "schema_auto.sql"));
  const generatedPath = join(output, "generated.rs");
  await writeFile(generatedPath, `${await readFile(generatedPath, "utf8")}\npub fn manual_sentinel() {}\n`);
  const repeated = await compile(NodeHost, join(compiled.projectRoot, "main.tsp"), { noEmit: false });
  clean(repeated);
  assert.equal((await stat(join(output, "intern_auto.rs"))).mtimeMs, internBefore.mtimeMs);
  assert.equal((await stat(join(output, "schema_auto.sql"))).mtimeMs, sqlBefore.mtimeMs);
  assert.match(await readFile(generatedPath, "utf8"), /pub fn manual_sentinel\(\) \{\}/);

  await writeOutput(emitSqlxRust(compiled, generatedPath), output);
  const changedDriver = await readFile(generatedPath, "utf8");
  assert.doesNotMatch(changedDriver, /RusqliteWriteConnection/);
  assert.match(changedDriver, /pub fn manual_sentinel\(\) \{\}/);
});

test("rusqlite conflicts with SQLx and binding-core in both import orders before output", async () => {
  for (const other of [join(sqlxRoot, "lib/main.tsp"), join(bindingRoot, "lib/main.tsp")]) {
    for (const imports of [[join(root, "lib/main.tsp"), other], [other, join(root, "lib/main.tsp")]]) {
      const compiled = await program("model E { @Entity.pk id: integer; }", imports, false);
      assert.equal(compiled.hasError(), true);
      assert.match(compiled.diagnostics.map((diagnostic) => formatDiagnostic(diagnostic)).join("\n"), /Conflicting automatic emitters imported:/);
      await assert.rejects(stat(join(compiled.projectRoot, "tsp-output")), { code: "ENOENT" });
    }
  }
});

test("unsupported dialect, invalid names and types, and noEmit publish no output", async () => {
  const compiled = await program("@Entity.intern scalar S extends string; model E { value: S; }");
  clean(compiled);
  const unsupported = { ...sqliteDialect, name: "postgres" };
  assert.throws(() => rusqliteStorage(compiled, { dialect: unsupported }), /supports only the sqlite dialect/);
  assert.throws(
    () => emitInternRusqlite(internStorage(compiled), rusqliteRustType, rusqliteRustIdent, unsupported),
    /supports only the sqlite dialect/,
  );
  await assert.rejects(stat(join(compiled.projectRoot, "tsp-output")), { code: "ENOENT" });

  for (const source of [
    "model `bad-name` { @Entity.pk id: integer; }",
    "model BadType { @Entity.pk id: integer; value: uint64; }",
  ]) {
    const invalid = await program(source, undefined, false);
    assert.equal(invalid.hasError(), true);
    await assert.rejects(stat(join(invalid.projectRoot, "tsp-output")), { code: "ENOENT" });
  }
});

test("public emission APIs retain manual zones", async () => {
  const compiled = await program("model E { @Entity.pk id: integer; name: string; }");
  clean(compiled);
  const directory = join(scratch, "public-api");
  await mkdir(directory);
  await writeOutput(emitRusqliteRust(compiled), directory);
  const generatedPath = join(directory, "generated.rs");
  await writeFile(generatedPath, `${await readFile(generatedPath, "utf8")}\npub fn public_manual() {}\n`);
  await writeOutput(emitRusqliteRust(compiled, generatedPath), directory);
  assert.match(await readFile(generatedPath, "utf8"), /pub fn public_manual\(\) \{\}/);
});
