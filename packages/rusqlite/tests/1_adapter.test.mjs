import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { writeOutput } from "@alloy-js/core";
import { compile, formatDiagnostic, NodeHost } from "@typespec/compiler";
import { emitSQLFromStorage } from "@hafley/typespec-sql";
import { sqlxStorage } from "../../sqlx/dist/src/index.js";
import { emitRusqliteRust, rusqliteStorage } from "../dist/src/index.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const bindingRoot = fileURLToPath(new URL("../../binding-core", import.meta.url));
const scratch = await mkdtemp(join(tmpdir(), "typespec-rusqlite-adapter-"));
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
  await symlink(root, join(directory, "node_modules/@hafley/typespec-rusqlite"), "dir");
  const main = join(directory, "main.tsp");
  await writeFile(main, `import "@hafley/typespec-rusqlite";\n${source}`);
  return compile(NodeHost, main, { noEmit });
}

function clean(compiled) {
  assert.deepEqual(compiled.diagnostics.map((diagnostic) => formatDiagnostic(diagnostic)), []);
}

const extraFixture = `
@Entity.intern scalar \`self\` extends string;
model SelfValue {
  @Entity.pk id: integer;
  @Entity.unique(SelfValue.value)
  value: \`self\`;
}
`;

test("public package import and SQLx use the identical SQL storage projection", async () => {
  const fixture = `${await readFile(join(bindingRoot, "tests/0_intern.tsp"), "utf8")}\n${extraFixture}`;
  const compiled = await packageProgram(fixture);
  clean(compiled);
  const native = rusqliteStorage(compiled);
  const sqlx = sqlxStorage(compiled);
  const normalize = (storage) => ({
    domains: storage.interned.domains.map((domain) => domain.table),
    interned: storage.interned.entities.map((entity) => [entity.table, entity.fields.map((field) => [field.name, field.column])]),
    ordinary: storage.entities.map((entity) => [entity.name, storage.fieldsByEntity.get(entity.name).map((field) => [field.name, field.typeName])]),
  });
  assert.deepEqual(normalize(native), normalize(sqlx));
  assert.equal(
    emitSQLFromStorage(compiled, native.interned, native.dialect),
    emitSQLFromStorage(compiled, sqlx.interned, sqlx.dialect),
  );
});

test("generated complete rusqlite module executes shared storage fixture", { timeout: 300_000 }, async () => {
  const fixture = `${await readFile(join(bindingRoot, "tests/0_intern.tsp"), "utf8")}\n${extraFixture}`;
  const compiled = await program(fixture);
  clean(compiled);
  const directory = join(scratch, "runtime");
  await mkdir(join(directory, "src"), { recursive: true });
  const storage = rusqliteStorage(compiled);
  await writeOutput(emitRusqliteRust(compiled), directory);
  await writeFile(join(directory, "schema_auto.sql"), emitSQLFromStorage(compiled, storage.interned, storage.dialect));
  await writeFile(join(directory, "src/lib.rs"), await readFile(join(root, "tests/1_runtime.rs"), "utf8"));
  await writeFile(join(directory, "intern_golden.txt"), await readFile(join(bindingRoot, "tests/1_intern_golden.txt"), "utf8"));
  await writeFile(join(directory, "Cargo.toml"), `[package]\nname="rusqlite-adapter-test"\nversion="0.0.0"\nedition="2021"\n[workspace]\n[dependencies]\nrusqlite="=0.40.2"\nserde={version="1",features=["derive"]}\n[profile.dev]\ndebug=0\nincremental=false\n`);
  const code = await new Promise((done, reject) => {
    const child = spawn("cargo", ["test", "--offline", "--quiet", "--manifest-path", join(directory, "Cargo.toml")], {
      stdio: "inherit",
      env: {
        ...process.env,
        INTERN_TEST_DATABASE: join(directory, "test.db"),
        CARGO_TARGET_DIR: process.env.C2_RUSQLITE_CARGO_TARGET,
      },
    });
    child.on("error", reject);
    child.on("close", done);
  });
  assert.equal(code, 0);
});
