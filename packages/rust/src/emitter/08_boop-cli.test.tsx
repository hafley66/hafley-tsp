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
  expect(service.operations.flatMap(op => op.params.filter(p => p.cli?.valueName?.includes("-OR-") || p.cli?.valueName?.includes("|")).map(p => [op.path, p.name, p.cli?.valueName]))).toMatchInlineSnapshot(`
    [
      [
        "/mail/wait/{id_or_job}",
        "id_or_job",
        "ID-OR-JOB",
      ],
      [
        "/beep/agent/waterfall/",
        "ms_duration",
        "MS|DURATION",
      ],
      [
        "/wait/{id_or_lane}",
        "id_or_lane",
        "ID-OR-LANE",
      ],
    ]
  `);
  expect(types.filter(t => t.kind === "model").every(t => t.name.endsWith("Flag"))).toEqual(true);
  expect(service.operations.every(op => !op.path.includes("positional_"))).toEqual(true);
  expect(service.operations.every(op => op.name === (op.path.replace(/\{[^}]*\}/g, "").split("/").filter(Boolean).at(-1)?.replaceAll("-", "_") ?? "root"))).toEqual(true);
});
