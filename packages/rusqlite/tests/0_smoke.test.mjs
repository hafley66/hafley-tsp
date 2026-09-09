import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { writeOutput } from "@alloy-js/core";
import { compile, formatDiagnostic, NodeHost } from "@typespec/compiler";
import { emitSQL } from "@hafley/typespec-sql";
import { emitRusqliteRust } from "../dist/src/index.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const scratch = await mkdtemp(join(tmpdir(), "typespec-rusqlite-smoke-"));

test("minimal generated rusqlite writer uses nested native savepoints", { timeout: 300_000 }, async () => {
  const main = join(scratch, "main.tsp");
  await writeFile(main, `import ${JSON.stringify(join(root, "lib/main.tsp"))};
@Entity.intern scalar S extends string;
model E { @Entity.pk id: integer; @Entity.unique(E.value) value: S; }
model AutoOnly { @Entity.pk key: integer; }
model UniqueOnly { @Entity.pk key: integer; @Entity.unique(UniqueOnly.inserted) inserted: string; }
model Ordinary { @Entity.pk record_key: integer; @Entity.unique(Ordinary.name) name: string; note: string | null; }
model Collision { @Entity.pk id: integer; conn: string; tx: string; }
`);
  const program = await compile(NodeHost, main, { noEmit: true });
  assert.deepEqual(program.diagnostics.map((diagnostic) => formatDiagnostic(diagnostic)), []);
  const directory = join(scratch, "rust");
  await mkdir(join(directory, "src"), { recursive: true });
  await writeOutput(emitRusqliteRust(program), directory);
  await writeFile(join(directory, "schema_auto.sql"), emitSQL(program));
  await writeFile(join(directory, "src/lib.rs"), `#[path = "../generated.rs"] mod generated;
use generated::*;
#[test]
fn smoke() -> rusqlite::Result<()> {
 let mut db = rusqlite::Connection::open_in_memory()?;
 db.execute_batch(include_str!("../schema_auto.sql"))?;
 assert_eq!(upsert_E(&mut db, "one")?, 1);
 assert_eq!(upsert_auto_only(&mut db)?, 1);
 assert_eq!(upsert_auto_only(&mut db)?, 2);
 let unique_key = upsert_unique_only(&mut db, "same")?;
 assert_eq!(upsert_unique_only(&mut db, "same")?, unique_key);
 let ordinary_key = upsert_ordinary(&mut db, "name", Some("before"))?;
 assert_eq!(upsert_ordinary(&mut db, "name", Some("after"))?, ordinary_key);
 assert_eq!(db.query_row("SELECT note FROM ordinary WHERE record_key = ?1", [ordinary_key], |row| row.get::<_, String>(0))?, "after");
 assert_eq!(upsert_collision(&mut db, "connection", "savepoint")?, 1);
 let mut outer = db.transaction()?;
 assert_eq!(upsert_E(&mut outer, "two")?, 2);
 { let mut nested = outer.savepoint()?; assert_eq!(upsert_E(&mut nested, "three")?, 3); nested.rollback()?; }
 outer.rollback()?;
 assert_eq!(db.query_row("SELECT count(*) FROM S", [], |row| row.get::<_, i64>(0))?, 1);
 Ok(())
}
`);
  await writeFile(join(directory, "Cargo.toml"), `[package]\nname="rusqlite-smoke"\nversion="0.0.0"\nedition="2021"\n[workspace]\n[dependencies]\nrusqlite="=0.40.2"\nserde={version="1",features=["derive"]}\n[profile.dev]\ndebug=0\nincremental=false\n`);
  const code = await new Promise((done, reject) => {
    const child = spawn("cargo", ["test", "--offline", "--quiet", "--manifest-path", join(directory, "Cargo.toml")], {
      stdio: "inherit",
      env: { ...process.env, CARGO_TARGET_DIR: process.env.C2_RUSQLITE_CARGO_TARGET },
    });
    child.on("error", reject);
    child.on("close", done);
  });
  assert.equal(code, 0);
});
