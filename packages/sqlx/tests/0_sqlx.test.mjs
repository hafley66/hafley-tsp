import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { compile, formatDiagnostic, NodeHost } from "@typespec/compiler";
import { writeOutput } from "@alloy-js/core";
import { emitSQL, internStorage, sqliteDialect } from "@hafley/typespec-sql";
import { emitInternRust, emitSqlxRust, rustIdent, rustType, sqlxStorage } from "../dist/src/index.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const bindingRoot = fileURLToPath(new URL("../../binding-core", import.meta.url));
const scratch = await mkdtemp(join(tmpdir(), "typespec-sqlx-"));
let serial = 0;

async function program(source, imports = [join(root, "lib/main.tsp")], noEmit = true) {
  const directory = join(scratch, String(serial++));
  await mkdir(directory);
  const main = join(directory, "main.tsp");
  await writeFile(main, [...imports.map((path) => `import ${JSON.stringify(path)};`), source].join("\n"));
  return compile(NodeHost, main, { noEmit });
}

async function packageProgram(source, noEmit = true) {
  const directory = join(scratch, String(serial++));
  await mkdir(join(directory, "node_modules/@hafley"), { recursive: true });
  await symlink(root, join(directory, "node_modules/@hafley/typespec-sqlx"), "dir");
  const main = join(directory, "main.tsp");
  await writeFile(main, `import "@hafley/typespec-sqlx";\n${source}`);
  return compile(NodeHost, main, { noEmit });
}

function clean(compiled) {
  assert.deepEqual(compiled.diagnostics.map((diagnostic) => formatDiagnostic(diagnostic)), []);
}

test("public SQLx storage composition emits ordinary and interned Rust", async () => {
  const fixture = await readFile(join(bindingRoot, "tests/0_intern.tsp"), "utf8");
  const compiled = await packageProgram(fixture);
  clean(compiled);
  const storage = sqlxStorage(compiled);
  assert.deepEqual(storage.entities.map((model) => model.name), ["Scope"]);
  assert.deepEqual(storage.interned.domains.map((domain) => domain.table), ["Symbol", "Path"]);
  const directory = join(scratch, "public-output");
  await mkdir(directory);
  await writeOutput(emitSqlxRust(compiled), directory);
  const generated = await readFile(join(directory, "generated.rs"), "utf8");
  const intern = await readFile(join(directory, "intern_auto.rs"), "utf8");
  assert.match(generated, /pub struct Scope/);
  assert.match(generated, /pub mod intern_auto;/);
  assert.match(intern, /pub async fn intern_Symbol/);
  assert.match(intern, /pub async fn upsert_Link/);
});

test("SQLx hook preserves auto-file mtimes and generated manual content", async () => {
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
});

test("conflicting automatic emitters reject both import orders before output", async () => {
  const sqlx = join(root, "lib/main.tsp");
  const binding = join(bindingRoot, "lib/main.tsp");
  for (const imports of [[sqlx, binding], [binding, sqlx]]) {
    const compiled = await program("model E { @Entity.pk id: integer; }", imports, false);
    assert.equal(compiled.hasError(), true);
    assert.match(compiled.diagnostics.map((diagnostic) => formatDiagnostic(diagnostic)).join("\n"), /Conflicting automatic emitters imported: binding-core, sqlx/);
    await assert.rejects(stat(join(compiled.projectRoot, "tsp-output")), { code: "ENOENT" });
  }
});

test("unsupported dialect, invalid adapter names, and noEmit produce no output", async () => {
  const compiled = await program("@Entity.intern scalar S extends string; model E { value: S; }");
  clean(compiled);
  const unsupported = { ...sqliteDialect, name: "postgres" };
  assert.throws(() => sqlxStorage(compiled, { dialect: unsupported }), /supports only the sqlite dialect/);
  assert.throws(() => emitInternRust(internStorage(compiled), rustType, rustIdent, unsupported), /supports only the sqlite dialect/);
  await assert.rejects(stat(join(compiled.projectRoot, "tsp-output")), { code: "ENOENT" });

  const invalid = await program("@Entity.intern scalar `bad-name` extends string; model E { value: `bad-name`; }", undefined, false);
  assert.equal(invalid.hasError(), true);
  await assert.rejects(stat(join(invalid.projectRoot, "tsp-output")), { code: "ENOENT" });

  const explicitUpsert = await program(
    '@Entity.intern scalar S extends string; @Sync.strategy("upsert") model E { value: S; }',
    [join(bindingRoot, "lib/main.tsp")],
    false,
  );
  assert.equal(explicitUpsert.hasError(), true);
  assert.match(explicitUpsert.diagnostics.map((diagnostic) => formatDiagnostic(diagnostic)).join("\n"), /custom sync strategies are not supported for interned entities/);
  await assert.rejects(stat(join(explicitUpsert.projectRoot, "tsp-output")), { code: "ENOENT" });
});

test("standalone generated SQLx Rust executes the existing SQLite fixture", { timeout: 300_000 }, async () => {
  const fixture = await readFile(join(bindingRoot, "tests/0_intern.tsp"), "utf8");
  const compiled = await program(fixture);
  clean(compiled);
  const directory = join(scratch, "rust");
  await mkdir(join(directory, "src"), { recursive: true });
  await writeOutput(emitSqlxRust(compiled), directory);
  await writeFile(join(directory, "schema_auto.sql"), emitSQL(compiled));
  await writeFile(join(directory, "src/lib.rs"), await readFile(join(bindingRoot, "tests/1_intern.rs")));
  await writeFile(join(directory, "intern_golden.txt"), await readFile(join(bindingRoot, "tests/1_intern_golden.txt")));
  await writeFile(join(directory, "Cargo.toml"), `[package]\nname="sqlx-emitter-test"\nversion="0.0.0"\nedition="2021"\n[workspace]\n[dependencies]\nanyhow="1"\nserde={version="1",features=["derive"]}\nsqlx={version="=0.8.6",default-features=false,features=["runtime-tokio","sqlite"]}\ntokio={version="1",features=["macros","rt-multi-thread"]}\n[profile.dev]\ndebug=0\nincremental=false\n`);
  const result = await new Promise((done, reject) => {
    const child = spawn("cargo", ["test", "--offline", "--quiet", "--manifest-path", join(directory, "Cargo.toml")], {
      stdio: "inherit",
      env: {
        ...process.env,
        INTERN_TEST_DATABASE: join(directory, "test.db"),
        CARGO_TARGET_DIR: process.env.C1_SQLX_CARGO_TARGET,
      },
    });
    child.on("error", reject);
    child.on("close", done);
  });
  assert.equal(result, 0);
});
