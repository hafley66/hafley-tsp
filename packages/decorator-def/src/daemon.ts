import type { DecoratorContext, Namespace, Program } from "@typespec/compiler";
import { $bodyIgnore, getRoutePath, isBodyRoot, isHeader, isPathParam, isQueryParam, setRoute } from "@typespec/http";
import { DecoratorDefStateKeys } from "./lib.js";

export interface DaemonOptions {
  idleSecs: number;
  handshake: boolean;
  serverBin?: string;
}

const daemonContexts = new WeakMap<Program, Map<Namespace, DecoratorContext>>();

export function $daemon(context: DecoratorContext, target: Namespace, options: DaemonOptions): void {
  context.program.stateMap(DecoratorDefStateKeys.daemon).set(target, options);
  let contexts = daemonContexts.get(context.program);
  if (!contexts) {
    contexts = new Map();
    daemonContexts.set(context.program, contexts);
  }
  contexts.set(target, context);
}

export function getDaemon(program: Program, target: Namespace): DaemonOptions | undefined {
  return program.stateMap(DecoratorDefStateKeys.daemon).get(target);
}

// Namespace decorators run before the namespace's operations are declared.
// This validator must load before @typespec/http's duplicate-route validator.
export function $onValidate(program: Program): void {
  for (const [target] of program.stateMap(DecoratorDefStateKeys.daemon)) {
    const namespace = target as Namespace;
    const context = daemonContexts.get(program)?.get(namespace);
    if (!context) continue;
    for (const op of namespace.operations.values()) {
      if (getRoutePath(program, op) === undefined) {
        setRoute(context, op, { path: `/${op.name}`, shared: false });
      }
      // Args for a streamed body travel in the generated request header.
      // Exclude them from HTTP's implicit body while retaining their clap shape.
      if ([...op.parameters.properties.values()].some(prop => isBodyRoot(program, prop))) {
        for (const prop of op.parameters.properties.values()) {
          if (!isBodyRoot(program, prop) && !isHeader(program, prop) && !isPathParam(program, prop) && !isQueryParam(program, prop)) {
            $bodyIgnore(context, prop);
          }
        }
      }
    }
  }
}
