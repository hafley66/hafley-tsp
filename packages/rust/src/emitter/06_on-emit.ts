import type { EmitContext } from "@typespec/compiler";
import { programToOps } from "../adapters/02_http-ops.js";
import { emitCrate, type Transport } from "./03_emit-crate.js";
import { writeCrate } from "./05_write-crate.js";

export interface OpsEmitterOptions {
  bin?: string;
  routes?: { from: string; to: string }[];
  // Transports the ops project onto; default ["cli", "http"]. ["http"] emits no clap.
  transports?: Transport[];
  // Rust path the output is mounted at, e.g. "crate::_9_wire"; default "crate".
  "module-prefix"?: string;
  // Generated trait the axum router serves through State<Arc<S>>, e.g. "Wire".
  "handler-trait"?: string;
}

// `tsp compile ops.tsp --emit @hafley66/alloy-rs`: models + ops_auto/ops/cli_auto/http_auto into emitterOutputDir.
export async function $onEmit(context: EmitContext<OpsEmitterOptions>): Promise<void> {
  if (context.program.compilerOptions.noEmit) return;
  const { types, service } = programToOps(context.program);
  const options = context.options;
  const crate = emitCrate(types, {
    modulePrefix: options["module-prefix"],
    ops: { service, bin: options.bin, transports: options.transports, handlerTrait: options["handler-trait"] },
  });
  writeCrate(crate, context.emitterOutputDir, options.routes && Object.fromEntries(options.routes.map(route => [route.from, route.to])));
}
