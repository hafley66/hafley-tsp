import type { Refkey } from "@alloy-js/core";
import type { OperationDef, OperationParam } from "./0_types.js";

export function pascalCase(name: string): string {
  return name
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map(part => part[0]!.toUpperCase() + part.slice(1))
    .join("");
}

export type CliRole = "positional" | "flag" | "flatten" | "stream";

export function roleOf(param: OperationParam): CliRole {
  if (param.stream) return "stream";
  if (param.cli?.positional) return "positional";
  if (param.source === "path") return "positional";
  if (param.source === "body" && param.type.kind === "model") return "flatten";
  return "flag";
}

// Insertion order follows the HTTP operation walk. Parameter and query template
// segments do not introduce commands. A node can own args and child commands.
export interface RouteNode<P> {
  segment: string;
  path: string[];
  variant: string;
  enumName: string;
  commandName: string;
  key: Refkey;
  commandKey: Refkey;
  plan?: P;
  children: Map<string, RouteNode<P>>;
}

export function planCliTree<P extends { op: OperationDef }>(plans: P[], newKey: () => Refkey): RouteNode<P> {
  const node = (segment: string, path: string[]): RouteNode<P> => ({
    segment, path, variant: pascalCase(segment),
    enumName: path.length ? pascalCase(path.join("_")) + "Cmd" : "Cmd",
    commandName: pascalCase(path.join("_")) + "Command",
    key: newKey(), commandKey: newKey(), children: new Map(),
  });
  const root = node("", []);
  for (const plan of plans) {
    const segments = plan.op.path.replace(/\{[^}]*\}/g, "").split("/").filter(Boolean);
    let current = root;
    for (const segment of segments) {
      let child = current.children.get(segment);
      if (!child) {
        child = node(segment, [...current.path, segment]);
        current.children.set(segment, child);
      }
      current = child;
    }
    if (current.plan) throw new Error(`Multiple clap operations at /${segments.join("/")}`);
    current.plan = plan;
  }
  return root;
}
