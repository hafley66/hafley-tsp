import type { EmitContext } from "@typespec/compiler";
import { programToOps } from "../adapters/02_http-ops.js";
import { emitCrate } from "./03_emit-crate.js";
import { writeCrate } from "./05_write-crate.js";

export interface OpsEmitterOptions {
  bin?: string;
}

// `tsp compile ops.tsp --emit @hafley66/alloy-rs`: models + ops_auto/ops/cli_auto/http_auto into emitterOutputDir.
export async function $onEmit(context: EmitContext<OpsEmitterOptions>): Promise<void> {
  if (context.program.compilerOptions.noEmit) return;
  const { types, service } = programToOps(context.program);
  writeCrate(emitCrate(types, { ops: { service, bin: context.options.bin } }), context.emitterOutputDir);
}
