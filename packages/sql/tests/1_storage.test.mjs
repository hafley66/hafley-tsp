import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { compile, formatDiagnostic, NodeHost } from "@typespec/compiler";
import { emitSQL, internStorage, sqliteDialect } from "../dist/src/index.js";
import { internStorage as legacyInternStorage } from "../../binding-core/dist/src/index.js";

const sqlRoot = fileURLToPath(new URL("..", import.meta.url));
const bindingRoot = fileURLToPath(new URL("../../binding-core", import.meta.url));
const scratch = await mkdtemp(join(tmpdir(), "sql-storage-"));
let serial = 0;

async function program(source, library = sqlRoot, noEmit = true) {
  const directory = join(scratch, String(serial++));
  await mkdir(directory);
  const main = join(directory, "main.tsp");
  await writeFile(main, `import ${JSON.stringify(join(library, "lib/main.tsp"))};\n${source}`);
  return compile(NodeHost, main, { noEmit });
}

function clean(compiled) {
  assert.deepEqual(compiled.diagnostics.map((diagnostic) => formatDiagnostic(diagnostic)), []);
}

test("SQL-only import exposes storage projection and preserves default SQLite output", async () => {
  const compiled = await program("@Entity.intern scalar S extends string; model E { @Entity.pk id: integer; value: S; plain: Mystery; } scalar Mystery extends string;");
  clean(compiled);
  const storage = internStorage(compiled);
  assert.deepEqual(
    [storage.domains.map((domain) => domain.table), storage.entities.map((entity) => [entity.table, entity.fields.map((field) => [field.name, field.column])])],
    [["S"], [["E", [["id", "id"], ["value", "value_id"], ["plain", "plain"]]]]],
  );
  assert.equal(
    emitSQL(compiled),
    "\nCREATE TABLE IF NOT EXISTS \"S\" (\n    id INTEGER PRIMARY KEY,\n    value TEXT NOT NULL UNIQUE\n);\n\nCREATE TABLE IF NOT EXISTS \"E\" (\n    \"id\" INTEGER PRIMARY KEY,\n    \"value_id\" INTEGER NOT NULL REFERENCES \"S\"(id),\n    \"plain\" TEXT NOT NULL\n);\n\nCREATE VIEW IF NOT EXISTS \"E_text\" AS\nSELECT e.\"id\" AS \"id\", d1.value AS \"value\", e.\"plain\" AS \"plain\" FROM \"E\" AS e\nLEFT JOIN \"S\" AS d1 ON d1.id = e.\"value_id\"\n;\n",
  );

  const ordinary = await program("model Ordinary { @Entity.pk id: integer; label: Mystery; } scalar Mystery extends string;");
  clean(ordinary);
  assert.equal(emitSQL(ordinary), "CREATE TABLE IF NOT EXISTS ordinary (\n    id INTEGER PRIMARY KEY AUTOINCREMENT,\n    label TEXT NOT NULL\n);\n\n");
});

test("custom dialect methods receive their dialect object", async () => {
  const compiled = await program("@Entity.intern scalar S extends string; model E { value: S; }");
  clean(compiled);
  const dialect = {
    ...sqliteDialect,
    marker: "`",
    exactTextType: "CLOB",
    quoteIdentifier(name) { return `${this.marker}${name}${this.marker}`; },
    scalarType(type) { return type === "integer" ? "BIGINT" : sqliteDialect.scalarType(type); },
  };
  const sql = emitSQL(compiled, dialect);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS `S`/);
  assert.match(sql, /id BIGINT PRIMARY KEY/);
  assert.match(sql, /value CLOB NOT NULL UNIQUE/);
  assert.match(sql, /`value_id` BIGINT NOT NULL REFERENCES `S`\(id\)/);
});

test("SQL import never emits and invalid declarations leave no output", async () => {
  const valid = await program("model E { @Entity.pk id: integer; }", sqlRoot, false);
  clean(valid);
  await assert.rejects(stat(join(valid.projectRoot, "tsp-output")), { code: "ENOENT" });

  const invalid = await program("@Entity.intern scalar Bad extends int32;", sqlRoot, false);
  assert.equal(invalid.hasError(), true);
  await assert.rejects(stat(join(invalid.projectRoot, "tsp-output")), { code: "ENOENT" });
});

test("legacy compatibility accepts an intern domain named self", async () => {
  const compiled = await program("@Entity.intern scalar `self` extends string; model E { value: `self`; }", bindingRoot);
  clean(compiled);
  assert.deepEqual(legacyInternStorage(compiled).domains.map((domain) => domain.table), ["self"]);
});
