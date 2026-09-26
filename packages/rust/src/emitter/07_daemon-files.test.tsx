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
  expect(written.sort().join(" ")).toMatchInlineSnapshot(`"cli_auto.rs client_auto.rs daemon_auto.rs lib.rs models/inputs.rs models/mod.rs models/root_args.rs ops.rs ops_auto.rs server_auto.rs"`);
  expect(readFileSync(join(dir, "daemon_auto.rs"), "utf8").trim()).toMatchInlineSnapshot(`
    "// Generated from DaemonFixture's @daemon service and path-valued operation parameters.
    use std::path::{Path, PathBuf};
    use serde::{Deserialize, Serialize};

    pub const IDLE_SECS: u64 = 37;
    pub const HANDSHAKE: bool = false;

    #[derive(Debug, Serialize, Deserialize)]
    pub struct Request {
        pub request_root: PathBuf,
        pub args: serde_json::Value,
    }

    impl Request {
        pub fn new<T: Serialize>(verb: &str, request_root: PathBuf, args: &T) -> Result<Self, serde_json::Error> {
            let mut args = serde_json::to_value(args)?;
            resolve_paths(verb, &request_root, &mut args);
            Ok(Self { request_root, args })
        }

        pub fn decode<T: serde::de::DeserializeOwned>(mut self, verb: &str) -> Result<T, String> {
            if !self.request_root.is_absolute() {
                return Err(\\"request_root must be absolute\\".into());
            }
            resolve_paths(verb, &self.request_root, &mut self.args);
            serde_json::from_value(self.args).map_err(|error| error.to_string())
        }
    }

    fn resolve_paths(verb: &str, root: &Path, args: &mut serde_json::Value) {
        let names: &[&str] = match verb {
            \\"extract\\" => &[\\"paths\\", \\"root\\"],
            \\"ingest\\" => &[],
            _ => &[],
        };
        let Some(object) = args.as_object_mut() else { return };
        for name in names {
            let Some(value) = object.get_mut(*name) else { continue };
            match value {
                serde_json::Value::String(path) => resolve_one(root, path),
                serde_json::Value::Array(paths) => {
                    for value in paths {
                        if let Some(path) = value.as_str().map(str::to_owned) {
                            let mut path = path;
                            resolve_one(root, &mut path);
                            *value = serde_json::Value::String(path);
                        }
                    }
                }
                _ => {}
            }
        }
    }

    fn resolve_one(root: &Path, path: &mut String) {
        if path == \\"-\\" || path.is_empty() || Path::new(path).is_absolute() { return; }
        *path = root.join(&*path).to_string_lossy().into_owned();
    }

    pub fn cache_dir() -> Result<PathBuf, std::io::Error> {
        let base = std::env::var_os(\\"XDG_CACHE_HOME\\").map(PathBuf::from).or_else(|| {
            std::env::var_os(\\"HOME\\").map(|home| PathBuf::from(home).join(\\".cache\\"))
        }).ok_or_else(|| std::io::Error::new(std::io::ErrorKind::NotFound, \\"HOME is unset\\"))?;
        if !base.is_absolute() {
            return Err(std::io::Error::new(std::io::ErrorKind::InvalidInput, \\"cache home must be absolute\\"));
        }
        Ok(base.join(\\"ryi\\"))
    }

    pub fn socket_path() -> Result<PathBuf, std::io::Error> {
        Ok(cache_dir()?.join(\\"ryi.sock\\"))
    }"
  `);
});
