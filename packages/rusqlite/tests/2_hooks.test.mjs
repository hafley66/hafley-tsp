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
  emitInternRusqlite, emitRusqliteRust, emitRusqliteTaggedRowWriter, emitRusqliteValueWriters, rusqliteRustIdent,
  rusqliteRustType, rusqliteStorage,
} from "../dist/src/index.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const sqlRoot = fileURLToPath(new URL("../../sql", import.meta.url));
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

test("value writers emit quoted static inserts without transaction ownership", async () => {
  const compiled = await program(
    "model E { @Entity.pk id: int64; `type`: string; value: uint64; }",
    [join(sqlRoot, "lib/main.tsp")],
  );
  clean(compiled);
  assert.equal(
    emitRusqliteValueWriters(compiled),
    `// Generated positional SQLite writers. Do not edit.
pub fn insert_values(
    conn: &rusqlite::Connection,
    table: &str,
    values: &[rusqlite::types::Value],
) -> rusqlite::Result<usize> {
    match table {
        "e" => conn.prepare_cached("INSERT INTO \\"e\\" (\\"id\\", \\"type\\", \\"value\\") VALUES (?, ?, ?)")?.execute(rusqlite::params_from_iter(values)),
        _ => Err(rusqlite::Error::InvalidParameterName(table.to_owned())),
    }
}
`,
  );
  assert.throws(
    () => emitRusqliteValueWriters(compiled, { dialect: { ...sqliteDialect, name: "postgres" } }),
    /supports? only the sqlite dialect/,
  );
});

test("tagged row writer derives its source and ordinal names from options", async () => {
  const compiled = await program(`
    namespace Events;
    model Stored { @Entity.pk sequence: int64; origin: string | null; }
    enum Flavor { Sweet: "sweet", Dry: "dry" }
    model Alpha { ...Stored; kind: "alpha"; value: string; flavor: Flavor; }
    model Beta { ...Stored; kind: "beta"; count: uint32; }
  `, [join(sqlRoot, "lib/main.tsp")]);
  clean(compiled);
  const rust = emitRusqliteTaggedRowWriter(compiled, {
    namespace: "Events",
    discriminator: "kind",
    ordinalSourceField: "sequence",
    sourceFields: [
      { property: "sequence", rustName: "offset" },
      { property: "origin", rustName: "scope" },
    ],
  });
  assert.match(rust, /pub struct Source<'a>[\s\S]*pub offset: i64,[\s\S]*pub scope: Option<&'a str>/);
  assert.match(rust, /pub const TABLE_COUNT: usize = 2;/);
  assert.match(rust, /source\.offset\.checked_add/);
  assert.match(rust, /let row_source = Source \{ offset: source\.offset \+ index as i64, scope: source\.scope \}/);
  assert.match(rust, /impl models::Alpha[\s\S]*INSERT INTO \\"alpha\\"/);
  assert.doesNotMatch(rust, /input_path|content_id|source\.row/);

  const interned = await program(`
    namespace Events {
      @Entity.intern scalar Token extends string;
      model Stored { @Entity.pk sequence: int64; }
      model Alpha { ...Stored; kind: "alpha"; token: Token; }
    }
  `, [join(sqlRoot, "lib/main.tsp")]);
  clean(interned);
  assert.throws(() => emitRusqliteTaggedRowWriter(interned, {
    namespace: "Events", discriminator: "kind", ordinalSourceField: "sequence",
    sourceFields: [{ property: "sequence", rustName: "offset" }],
  }), /do not support interned storage/);
});
