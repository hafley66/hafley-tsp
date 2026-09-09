import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { compile, NodeHost, formatDiagnostic } from "@typespec/compiler";
import { SqlStateKeys, $decorators as sqlDecorators, getInternScalar as getSqlInternScalar } from "../dist/src/index.js";
import { BindingCoreStateKeys, $decorators as legacyDecorators, getInternScalar as getLegacyInternScalar } from "../../binding-core/dist/src/index.js";

const sqlRoot = fileURLToPath(new URL("..", import.meta.url));
const bindingRoot = fileURLToPath(new URL("../../binding-core", import.meta.url));

test("mixed SQL and binding-core imports share declarations and state", async () => {
  assert.equal(BindingCoreStateKeys.intern, SqlStateKeys.intern);
  assert.equal(BindingCoreStateKeys.pk, SqlStateKeys.pk);
  assert.equal(BindingCoreStateKeys.unique, SqlStateKeys.unique);
  assert.equal(BindingCoreStateKeys.manual, SqlStateKeys.manual);
  assert.equal(BindingCoreStateKeys.index, SqlStateKeys.index);
  assert.equal(BindingCoreStateKeys.default, SqlStateKeys.default);
  assert.equal(BindingCoreStateKeys.relation, SqlStateKeys.relation);
  assert.equal(legacyDecorators.Entity, sqlDecorators.Entity);
  assert.equal(legacyDecorators.Rel, sqlDecorators.Rel);
  assert.equal(legacyDecorators.Entity.intern, sqlDecorators.Entity.intern);
  assert.equal(legacyDecorators.Rel.belongsTo, sqlDecorators.Rel.belongsTo);

  const scratch = await mkdtemp(join(tmpdir(), "sql-ownership-"));
  await mkdir(scratch, { recursive: true });
  const main = join(scratch, "main.tsp");
  await writeFile(main, [
    `import ${JSON.stringify(join(sqlRoot, "lib/main.tsp"))};`,
    `import ${JSON.stringify(join(bindingRoot, "lib/main.tsp"))};`,
    "@Entity.intern scalar Shared extends string;",
    "model Parent { @Entity.pk id: integer; }",
    "model Child { @Rel.belongsTo parent: Parent; value: Shared; }",
  ].join("\n"));
  const program = await compile(NodeHost, main, { noEmit: true });
  assert.deepEqual(program.diagnostics.map((diagnostic) => formatDiagnostic(diagnostic)), []);
  const shared = program.getGlobalNamespaceType().scalars.get("Shared");
  assert.ok(shared);
  assert.equal(getSqlInternScalar(program, shared), shared);
  assert.equal(getLegacyInternScalar(program, shared), shared);
  assert.equal(program.stateMap(SqlStateKeys.intern).has(shared), true);
  assert.equal(program.stateMap(BindingCoreStateKeys.intern).has(shared), true);
  assert.equal(
    program.stateMap(SqlStateKeys.relation).get("Child"),
    program.stateMap(BindingCoreStateKeys.relation).get("Child"),
  );
});
