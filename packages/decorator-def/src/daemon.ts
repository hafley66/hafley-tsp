import type { DecoratorContext, Namespace, Program } from "@typespec/compiler";
import { getRoutePath, setRoute } from "@typespec/http";
import { DecoratorDefStateKeys } from "./lib.js";

export interface DaemonOptions {
  idleSecs: number;
  handshake: boolean;
}

export function $daemon(context: DecoratorContext, target: Namespace, options: DaemonOptions): void {
  context.program.stateMap(DecoratorDefStateKeys.daemon).set(target, options);
}

export function getDaemon(program: Program, target: Namespace): DaemonOptions | undefined {
  return program.stateMap(DecoratorDefStateKeys.daemon).get(target);
}

// Namespace decorators run before the namespace's operations are declared.
// This validator must load before @typespec/http's duplicate-route validator.
export function $onValidate(program: Program): void {
  for (const [target] of program.stateMap(DecoratorDefStateKeys.daemon)) {
    const namespace = target as Namespace;
    for (const op of namespace.operations.values()) {
      if (getRoutePath(program, op) === undefined) {
        setRoute({ program }, op, { path: `/${op.name}`, shared: false });
      }
    }
  }
}
