import { compile, NodeHost } from "@typespec/compiler";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { programToOps } from "../adapters/02_http-ops.js";
import { emitCrate } from "./03_emit-crate.js";
import { writeCrate } from "./05_write-crate.js";

it("assigns daemon routes during validation and emits both transports from the same models", async () => {
  const fixture = join(import.meta.dirname, "../../test/fixtures/daemon_cli/ops.tsp");
  const program = await compile(NodeHost, fixture, { noEmit: true });
  expect(program.diagnostics.map(d => d.message)).toMatchInlineSnapshot(`[]`);
  const { types, service } = programToOps(program);
  expect({ daemon: service.daemon, operations: service.operations.map(op => [op.verb, op.path, op.name]) }).toMatchInlineSnapshot(`
    {
      "daemon": {
        "handshake": false,
        "idleSecs": 37,
      },
      "operations": [
        ["post", "/extract", "extract"],
        ["post", "/ingest", "ingest"],
      ],
    }
  `);
  const dir = mkdtempSync(join(tmpdir(), "daemon-emitter-"));
  const written = writeCrate(emitCrate(types, { ops: { service, bin: "ryi" } }), dir);
  expect(written.includes("models/inputs.rs") && written.includes("client_auto.rs") && written.includes("server_auto.rs") && written.includes("daemon_auto.rs") && !written.includes("http_auto.rs")).toBe(true);
  expect(readFileSync(join(dir, "daemon_auto.rs"), "utf8")).toContain("pub const IDLE_SECS: u64 = 37;");
});
