import { compile, NodeHost } from "@typespec/compiler";
import { join } from "node:path";
import { emitCrate } from "./03_emit-crate.js";
import { writeCrate } from "./05_write-crate.js";
import { expect, it } from "vitest";
import { programToOps } from "../adapters/02_http-ops.js";

const fixture = join(import.meta.dirname, "../../test/fixtures/boop_cli");

it("compiles boop's plain HTTP command tree without Clap decorators", async () => {
  const program = await compile(NodeHost, join(fixture, "ops.tsp"), { noEmit: true });
  expect(program.diagnostics.map(d => `${d.code}: ${d.message}`)).toEqual([]);
  const { types, service } = programToOps(program);
  if (process.env.BOOP_EMIT) writeCrate(emitCrate(types, { ops: { service, bin: "boop", http: false } }), join(fixture, "parity/src"));
  expect(service.operations.length).toEqual(155);
  expect(new Set(service.operations.map(op => op.path.replace(/\{[^}]*\}/g, "").replace(/\/+$/, ""))).size).toEqual(155);
});
