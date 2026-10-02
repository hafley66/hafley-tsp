import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { emitCrate } from "./03_emit-crate.js";
import { writeCrate } from "./05_write-crate.js";
import type { ServiceDef, TypeDef } from "./00_types.js";
import { planOps } from "./04_ops-plan.js";
import { refkey } from "@alloy-js/core";

function file(node: any, path: string): string {
  for (const item of node.contents) {
    if (item.kind === "file" && item.path === path) return item.contents;
    if (item.kind === "directory") {
      const nested = file(item, path);
      if (nested) return nested;
    }
  }
  return "";
}

const str = { kind: "scalar" as const, name: "string" };
const uint = { kind: "scalar" as const, name: "uint64" };
const path = { kind: "scalar" as const, name: "path", alias: "path" };
const types: TypeDef[] = [
  {
    kind: "model", name: "Inputs", properties: [
      { name: "paths", type: { kind: "array", element: str }, cli: { positional: true, valueName: "PATH" } },
      { name: "patterns", type: { kind: "array", element: str }, cli: { long: "pattern", valueName: "GLOB", valueDelimiter: "," } },
    ],
  },
  { kind: "model", name: "FileArgs", properties: [{ name: "inputs", type: { kind: "model", name: "Inputs" } }] },
];
const service: ServiceDef = {
  name: "Probe", rootArgs: "FileArgs", argsConflictsWithSubcommands: true,
  afterHelp: "Build: $SPREFA_BUILD_GIT_HASH",
  operations: [{
    name: "graph", verb: "post", path: "/graph", requiredOneOf: ["callers", "uses"], requiredOneOfName: "arm",
    params: [
      { name: "inputs", type: { kind: "model", name: "Inputs" }, source: "body" },
      { name: "callers", type: str, source: "query", optional: true, cli: { valueName: "NAME", requires: "root", conflictsWith: ["uses"] } },
      { name: "uses", type: str, source: "query", optional: true },
      { name: "timeout", type: uint, source: "query", default: 30, cli: { minValue: 1 } },
      { name: "output", type: path, source: "query", default: "-" },
      { name: "trace", type: str, source: "header", headerName: "X-Trace", optional: true, cli: { skip: true } },
      { name: "tags", type: { kind: "array", element: str }, source: "header", headerName: "X-Tag", cli: { skip: true } },
    ],
  }, { name: "schema", verb: "post", path: "/schema", params: [] }],
};

describe("clap and HTTP field metadata", () => {
  it("renders root flatten, nested positional, group, constraints and header extraction", () => {
    const tree = emitCrate(types, { ops: { service, bin: "probe" } });
    const cli = file(tree, "cli_auto.rs");
    const input = file(tree, "models/inputs.rs");
    const ops = file(tree, "ops_auto.rs");
    const http = file(tree, "http_auto.rs");
    expect([
      cli.includes("args_conflicts_with_subcommands = true"),
      cli.includes("Option<Cmd>"),
      cli.includes("concat!(\"Build: \", env!(\"SPREFA_BUILD_GIT_HASH\")"),
      input.includes("#[arg(value_name = \"PATH\")]"),
      input.includes("#[arg(long = \"pattern\", value_name = \"GLOB\", value_delimiter = ',')]"),
      ops.includes("ArgGroup::new(\"arm\").required(true)"),
      ops.includes("requires = \"root\""),
      ops.includes("conflicts_with = \"uses\""),
      ops.includes("value_parser = clap::value_parser!(u64).range(1..)"),
      http.includes("headers.get(\"X-Trace\")"),
      http.includes("headers.get_all(\"X-Tag\")"),
      http.includes("headers: HeaderMap"),
      http.includes('query.output.unwrap_or(PathBuf::from("-"))'),
      cli.includes("Schema,"),
      cli.includes("Cmd::Schema"),
      ops.includes("pub struct SchemaArgs"),
    ]).toEqual(Array(16).fill(true));
  });

  it.skipIf(!process.env.CARGO_CHECK)("compiles the emitted clap and axum crate", () => {
    const dir = mkdtempSync(join(tmpdir(), "clap-fields-"));
    copyFileSync(join(import.meta.dirname, "../../test/fixtures/ryi_cli/parity/Cargo.toml"), join(dir, "Cargo.toml"));
    mkdirSync(join(dir, "src"));
    writeCrate(emitCrate(types, { ops: { service, bin: "probe" } }), join(dir, "src"));
    execFileSync("cargo", ["check", "--offline"], {
      cwd: dir,
      env: { ...process.env, SPREFA_BUILD_GIT_HASH: "test-hash" },
      stdio: "pipe",
    });
  }, 30000);
});

it("routes build nested enums, drop parameter segments, and dispatch group-local args", () => {
  const service: ServiceDef = {
    name: "Tree",
    operations: [
      { name: "root", verb: "post", path: "/", params: [{ name: "preset", type: str, source: "query", optional: true }] },
      { name: "sql", verb: "post", path: "/db", params: [{ name: "sql", type: str, source: "path", optional: true }] },
      { name: "db_list", verb: "post", path: "/db/session/{session_id}/list", params: [{ name: "session_id", type: str, source: "path" }] },
      { name: "job_list", verb: "post", path: "/job/list", params: [] },
    ],
  };
  expect(file(emitCrate([], { ops: { service, bin: "tree", http: false } }), "cli_auto.rs")).toMatchSnapshot();
});

it("qualifies repeated local operation names with route context", () => {
  const service: ServiceDef = {
    name: "Tree",
    operations: [
      { name: "list", verb: "post", path: "/db/session/{session_id}/list", params: [] },
      { name: "list", verb: "post", path: "/job/list", params: [] },
      { name: "status", verb: "post", path: "/status", params: [] },
    ],
  };
  expect(planOps(service, new Map(), refkey).map(p => [p.op.name, p.fn, p.argsName])).toMatchInlineSnapshot(`
    [
      [
        "list",
        "db_session_list",
        "DbSessionListArgs",
      ],
      [
        "list",
        "job_list",
        "JobListArgs",
      ],
      [
        "status",
        "status",
        "StatusArgs",
      ],
    ]
  `);
});
