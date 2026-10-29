import { compile, NodeHost } from "@typespec/compiler";
import type { OutputDirectory } from "@alloy-js/core";
import { execSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { programToOps, type ProgramOps } from "../adapters/02_http-ops.js";
import { emitCrate, type CrateEmitOptions } from "./03_emit-crate.js";
import { writeCrate } from "./05_write-crate.js";

const FIXTURE = join(import.meta.dirname, "../../test/fixtures/wire/wire.tsp");

function files(root: OutputDirectory, out: Record<string, string> = {}): Record<string, string> {
  for (const item of root.contents) {
    if (item.kind === "directory") files(item, out);
    else if ("contents" in item) out[item.path] = item.contents;
  }
  return out;
}

function useLines(text: string): string {
  return text.split("\n").filter(l => l.startsWith("use ")).join("\n");
}

describe("wire gaps: sprefa v9 HTTP boundary", () => {
  let ops: ProgramOps;
  let wire: Record<string, string>;
  let plain: Record<string, string>;
  const wireOptions = (): CrateEmitOptions => ({
    modulePrefix: "crate::_9_wire",
    ops: { service: ops.service, transports: ["http"], handlerTrait: "Wire" },
  });

  beforeAll(async () => {
    const program = await compile(NodeHost, FIXTURE, { noEmit: true });
    expect(program.diagnostics.map(d => d.message)).toEqual([]);
    ops = programToOps(program);
    wire = files(emitCrate(ops.types, wireOptions()));
    plain = files(emitCrate(ops.types, { ops: { service: ops.service, transports: ["http"] } }));
  });

  it("gap 1: unions emit enums whose serde shape is the openapi3 schema (anyOf / discriminated / string enum / nullable)", () => {
    expect(ops.types.map(t => `${t.kind} ${t.name}`).join("\n")).toMatchInlineSnapshot(`
      "model Circle
      model Square
      model Column
      model Change
      model Delta
      model Table
      model QueryRequest
      model QueryError
      model Missing
      model ServerError
      model BodyRejected
      enum ColType
      union Cell
      union Shape
      union Flat
      union ColumnMode"
    `);
    expect(wire["models/cell.rs"]).toMatchInlineSnapshot(`
      "use serde::Deserialize;
      use serde::Serialize;

      #[derive(Debug, Clone, Serialize, Deserialize)]
      #[serde(untagged)]
      #[allow(non_camel_case_types)]
      pub enum Cell {
        text(String),
        int(i64),
      }
      "
    `);
    expect(wire["models/shape.rs"]).toMatchInlineSnapshot(`
      "use serde::Deserialize;
      use serde::Serialize;

      use crate::_9_wire::models::circle::Circle;
      use crate::_9_wire::models::square::Square;

      #[derive(Debug, Clone, Serialize, Deserialize)]
      #[serde(tag = "kind", content = "value")]
      #[allow(non_camel_case_types)]
      pub enum Shape {
        circle(Circle),
        square(Square),
      }
      "
    `);
    expect(wire["models/flat.rs"]).toMatchInlineSnapshot(`
      "use serde::Deserialize;
      use serde::Serialize;

      use crate::_9_wire::models::circle::Circle;
      use crate::_9_wire::models::square::Square;

      #[derive(Debug, Clone, Serialize, Deserialize)]
      #[serde(tag = "kind")]
      #[allow(non_camel_case_types)]
      pub enum Flat {
        circle(Circle),
        square(Square),
      }
      "
    `);
    expect(wire["models/column_mode.rs"]).toMatchInlineSnapshot(`
      "use serde::Deserialize;
      use serde::Serialize;

      #[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
      #[allow(non_camel_case_types)]
      pub enum ColumnMode {
        fast,
        #[serde(rename = "slow-ish")]
        slow_ish,
      }
      "
    `);
  });

  it("gap 1: openapi3 schemas for the same unions", async () => {
    const out = mkdtempSync(join(tmpdir(), "wire-openapi-"));
    await compile(NodeHost, FIXTURE, {
      emit: ["@typespec/openapi3"],
      outputDir: out,
      options: { "@typespec/openapi3": { "emitter-output-dir": out } },
    });
    const yaml = readFileSync(join(out, readdirSync(out).find(f => f.endsWith(".yaml"))!), "utf8");
    const schemas = yaml.slice(yaml.indexOf("  schemas:"));
    const pick = (name: string) => {
      const start = schemas.indexOf(`\n    ${name}:\n`);
      const rest = schemas.slice(start + 1);
      const end = rest.slice(1).search(/\n    [A-Za-z]/);
      return end < 0 ? rest : rest.slice(0, end + 1);
    };
    expect(["Cell", "Shape", "ShapeCircle", "Flat", "Column"].map(pick).join("\n")).toMatchInlineSnapshot(`
      "    Cell:
            anyOf:
              - type: string
              - type: integer
                format: int64
            description: 'One column value: untagged, the OpenAPI schema is \`anyOf\`.'
          Shape:
            type: object
            oneOf:
              - $ref: '#/components/schemas/ShapeCircle'
              - $ref: '#/components/schemas/ShapeSquare'
            discriminator:
              propertyName: kind
              mapping:
                circle: '#/components/schemas/ShapeCircle'
                square: '#/components/schemas/ShapeSquare'
            description: 'Default envelope: \`{ "kind": "circle", "value": {...} }\`.'
          ShapeCircle:
            type: object
            required:
              - kind
              - value
            properties:
              kind:
                type: string
                enum:
                  - circle
              value:
                $ref: '#/components/schemas/Circle'
          Flat:
            type: object
            oneOf:
              - $ref: '#/components/schemas/Circle'
              - $ref: '#/components/schemas/Square'
            discriminator:
              propertyName: kind
              mapping:
                circle: '#/components/schemas/Circle'
                square: '#/components/schemas/Square'
            description: 'No envelope: \`{ "kind": "circle", "radius": 1 }\`.'
          Column:
            type: object
            required:
              - name
              - type
              - mode
              - note
            properties:
              name:
                type: string
              type:
                $ref: '#/components/schemas/ColType'
              mode:
                type: string
                enum:
                  - fast
                  - slow-ish
              note:
                type: string
                nullable: true"
    `);
  });

  it("gap 2: keyword fields are raw identifiers; the wire name stays `type` with no serde rename", () => {
    expect(wire["models/column.rs"]).toMatchInlineSnapshot(`
      "use serde::Deserialize;
      use serde::Serialize;

      use crate::_9_wire::models::col_type::ColType;
      use crate::_9_wire::models::column_mode::ColumnMode;

      #[derive(Debug, Clone, Serialize, Deserialize)]
      pub struct Column {
        pub name: String,
        pub r#type: ColType,
        pub mode: ColumnMode,
        pub note: Option<String>,
      }
      "
    `);
  });

  it("gap 3: http-only transports derive no clap and emit no cli_auto.rs", () => {
    expect(Object.keys(wire).sort().join(" ")).toMatchInlineSnapshot(`"http_auto.rs lib.rs models/body_rejected.rs models/cell.rs models/change.rs models/circle.rs models/col_type.rs models/column.rs models/column_mode.rs models/delta.rs models/flat.rs models/missing.rs models/mod.rs models/query_error.rs models/query_request.rs models/server_error.rs models/shape.rs models/square.rs models/table.rs ops_auto.rs"`);
    expect(Object.values(wire).filter(text => text.includes("clap")).length).toBe(0);
  });

  it("gap 4 + 5 + 7: ops_auto.rs carries the handler trait, the @error OpError, and module-prefixed paths", () => {
    expect(wire["ops_auto.rs"]).toMatchInlineSnapshot(`
      "use crate::_9_wire::models::body_rejected::BodyRejected;
      use crate::_9_wire::models::change::Change;
      use crate::_9_wire::models::column::Column;
      use crate::_9_wire::models::delta::Delta;
      use crate::_9_wire::models::missing::Missing;
      use crate::_9_wire::models::query_error::QueryError;
      use crate::_9_wire::models::query_request::QueryRequest;
      use crate::_9_wire::models::server_error::ServerError;
      use crate::_9_wire::models::table::Table;

      #[derive(Debug)]
      pub enum OpError {
        Internal(String),
        ServerError(ServerError),
        QueryError(QueryError),
        Missing(Missing),
        BodyRejected(BodyRejected),
      }

      impl<E: std::error::Error> From<E> for OpError {
          fn from(e: E) -> Self {
              OpError::Internal(e.to_string())
          }
      }

      impl From<ServerError> for OpError {
          fn from(e: ServerError) -> Self {
              OpError::ServerError(e)
          }
      }

      impl From<QueryError> for OpError {
          fn from(e: QueryError) -> Self {
              OpError::QueryError(e)
          }
      }

      impl From<Missing> for OpError {
          fn from(e: Missing) -> Self {
              OpError::Missing(e)
          }
      }

      impl From<BodyRejected> for OpError {
          fn from(e: BodyRejected) -> Self {
              OpError::BodyRejected(e)
          }
      }

      impl std::fmt::Display for OpError {
          fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
              match self {
                  OpError::Internal(message) => f.write_str(message),
                  OpError::ServerError(body) => f.write_str(&serde_json::to_string(body).map_err(|_| std::fmt::Error)?),
                  OpError::QueryError(body) => f.write_str(&serde_json::to_string(body).map_err(|_| std::fmt::Error)?),
                  OpError::Missing(body) => f.write_str(&serde_json::to_string(body).map_err(|_| std::fmt::Error)?),
                  OpError::BodyRejected(body) => f.write_str(&serde_json::to_string(body).map_err(|_| std::fmt::Error)?),
              }
          }
      }

      pub type OpResult<T> = Result<T, OpError>;

      #[derive(Debug, Clone, serde::Serialize)]
      pub struct CommitArgs {
        pub changes: Vec<Change>,
      }

      #[derive(Debug, Clone, serde::Serialize)]
      pub struct QueryArgs {
        pub request: QueryRequest,
      }

      #[derive(Debug, Clone, serde::Serialize, Default)]
      pub struct PlanArgs {}

      pub trait Wire: Send + Sync + 'static {
        fn commit(&self, args: &CommitArgs) -> OpResult<Delta>;
        fn query(&self, args: &QueryArgs) -> OpResult<Table>;
        fn plan(&self, args: &PlanArgs) -> OpResult<Vec<Column>>;
      }
      "
    `);
  });

  it("gap 4 + 7 + 8: http_auto.rs handlers take State<Arc<S>>, router(state), @statusCode mapping, 500 body is ServerError, undecodable body is 422 BodyRejected", () => {
    expect(wire["http_auto.rs"]).toMatchInlineSnapshot(`
      "use axum::Json;
      use axum::extract::State;
      use axum::extract::rejection::JsonRejection;
      use axum::http::StatusCode;
      use axum::response::IntoResponse;
      use axum::response::Response;
      use axum::routing::get;
      use axum::routing::post;
      use std::sync::Arc;

      use crate::_9_wire::models::body_rejected::BodyRejected;
      use crate::_9_wire::models::change::Change;
      use crate::_9_wire::models::column::Column;
      use crate::_9_wire::models::delta::Delta;
      use crate::_9_wire::models::query_request::QueryRequest;
      use crate::_9_wire::models::server_error::ServerError;
      use crate::_9_wire::models::table::Table;
      use crate::_9_wire::ops_auto::CommitArgs;
      use crate::_9_wire::ops_auto::OpError;
      use crate::_9_wire::ops_auto::OpResult;
      use crate::_9_wire::ops_auto::PlanArgs;
      use crate::_9_wire::ops_auto::QueryArgs;
      use crate::_9_wire::ops_auto::Wire;

      impl IntoResponse for OpError {
          fn into_response(self) -> Response {
              match self {
                  OpError::Internal(error) => (StatusCode::INTERNAL_SERVER_ERROR, Json(ServerError { error })).into_response(),
                  OpError::ServerError(body) => (StatusCode::from_u16(500).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR), Json(body)).into_response(),
                  OpError::QueryError(body) => (StatusCode::from_u16(400).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR), Json(body)).into_response(),
                  OpError::Missing(body) => (StatusCode::from_u16(404).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR), Json(body)).into_response(),
                  OpError::BodyRejected(body) => (StatusCode::from_u16(422).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR), Json(body)).into_response(),
              }
          }
      }

      pub async fn commit<S: Wire>(State(ops): State<Arc<S>>, Json(body): Json<Vec<Change>>) -> OpResult<Json<Delta>> {
        let args = CommitArgs {
            changes: body,
        };
        let out = tokio::task::spawn_blocking(move || ops.commit(&args)).await??;
        Ok(Json(out))
      }

      pub async fn query<S: Wire>(State(ops): State<Arc<S>>, body: Result<Json<QueryRequest>, JsonRejection>) -> OpResult<Json<Table>> {
        let Json(body) = body.map_err(|rejection| OpError::BodyRejected(BodyRejected { error: rejection.body_text() }))?;
        let args = QueryArgs {
            request: body,
        };
        let out = tokio::task::spawn_blocking(move || ops.query(&args)).await??;
        Ok(Json(out))
      }

      pub async fn plan<S: Wire>(State(ops): State<Arc<S>>) -> OpResult<Json<Vec<Column>>> {
        let args = PlanArgs {

        };
        let out = tokio::task::spawn_blocking(move || ops.plan(&args)).await??;
        Ok(Json(out))
      }

      pub fn router<S: Wire>(state: Arc<S>) -> axum::Router {
        axum::Router::new()
            .route("/commit", post(commit::<S>))
            .route("/query", post(query::<S>))
            .route("/plan", get(plan::<S>))
            .with_state(state)
      }
      "
    `);
  });

  it("gap 6: http_auto.rs imports only what it uses", () => {
    expect(useLines(wire["http_auto.rs"]!)).toMatchInlineSnapshot(`
      "use axum::Json;
      use axum::extract::State;
      use axum::extract::rejection::JsonRejection;
      use axum::http::StatusCode;
      use axum::response::IntoResponse;
      use axum::response::Response;
      use axum::routing::get;
      use axum::routing::post;
      use std::sync::Arc;
      use crate::_9_wire::models::body_rejected::BodyRejected;
      use crate::_9_wire::models::change::Change;
      use crate::_9_wire::models::column::Column;
      use crate::_9_wire::models::delta::Delta;
      use crate::_9_wire::models::query_request::QueryRequest;
      use crate::_9_wire::models::server_error::ServerError;
      use crate::_9_wire::models::table::Table;
      use crate::_9_wire::ops_auto::CommitArgs;
      use crate::_9_wire::ops_auto::OpError;
      use crate::_9_wire::ops_auto::OpResult;
      use crate::_9_wire::ops_auto::PlanArgs;
      use crate::_9_wire::ops_auto::QueryArgs;
      use crate::_9_wire::ops_auto::Wire;"
    `);
    expect(useLines(plain["http_auto.rs"]!)).toMatchInlineSnapshot(`
      "use axum::Json;
      use axum::extract::rejection::JsonRejection;
      use axum::http::StatusCode;
      use axum::response::IntoResponse;
      use axum::response::Response;
      use axum::routing::get;
      use axum::routing::post;
      use crate::models::body_rejected::BodyRejected;
      use crate::models::change::Change;
      use crate::models::column::Column;
      use crate::models::delta::Delta;
      use crate::models::query_request::QueryRequest;
      use crate::models::server_error::ServerError;
      use crate::models::table::Table;
      use crate::ops_auto::CommitArgs;
      use crate::ops_auto::OpError;
      use crate::ops_auto::OpResult;
      use crate::ops_auto::PlanArgs;
      use crate::ops_auto::QueryArgs;"
    `);
  });

  it.skipIf(!process.env.CARGO_CHECK)("generated crate: JSON round-trips the openapi3 shapes, maps @statusCode, answers 500 and 422 with declared models", () => {
    const dir = mkdtempSync(join(tmpdir(), "wire-crate-"));
    writeCrate(emitCrate(ops.types, wireOptions()), join(dir, "src/_9_wire"));
    writeFileSync(join(dir, "Cargo.toml"), `[package]
name = "wire_gaps"
version = "0.0.0"
edition = "2021"

[workspace]

[dependencies]
axum = "0.8"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["rt-multi-thread", "macros"] }

[dev-dependencies]
tower = { version = "0.5", features = ["util"] }
http-body-util = "0.1"

[profile.dev]
opt-level = 1

[profile.dev.package."*"]
opt-level = 3
`);
    writeFileSync(join(dir, "src/lib.rs"), "#![deny(warnings)]\npub mod _9_wire;\n");
    writeFileSync(join(dir, "src/_9_wire/mod.rs"), "pub mod http_auto;\npub mod models;\npub mod ops_auto;\n");
    mkdirSync(join(dir, "tests"), { recursive: true });
    writeFileSync(join(dir, "tests/wire.rs"), readFileSync(join(import.meta.dirname, "../../test/fixtures/wire/wire.rs"), "utf8"));
    const out = execSync("cargo test 2>&1", { cwd: dir, encoding: "utf8", env: { ...process.env, CARGO_TARGET_DIR: join(tmpdir(), "wire-gaps-target") } });
    expect(out.split("\n").filter(l => l.startsWith("test ") && !l.includes("result")).sort().join("\n")).toMatchInlineSnapshot(`
      "test json_shapes_match_openapi3 ... ok
      test router_serves_trait_state_and_maps_status_codes ... ok"
    `);
  }, 600_000);
});
