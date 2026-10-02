import { cIdentifier } from "../c/0_name-policy.js";
import { isTemplateDeclaration, type Enum, type Interface, type Model, type Namespace, type Program, type Scalar, type Union } from "@typespec/compiler";

export type Declaration = Scalar | Enum | Model | Union | Interface;
export function declarations(program: Program): Declaration[] {
  const out: Declaration[] = [];
  function walk(ns: Namespace) {
    if (ns.name === "TypeSpec") return;
    for (const collection of [ns.scalars, ns.enums, ns.models, ns.unions, ns.interfaces]) {
      for (const type of collection.values()) {
        if (!program.checker.isStdType(type) && !(type.kind !== "Enum" && isTemplateDeclaration(type)) && type.node) out.push(type);
      }
    }
    for (const child of ns.namespaces.values()) walk(child);
  }
  walk(program.getGlobalNamespaceType());
  return out;
}
export function pathOf(type: Declaration): string {
  if (!type.name) throw new Error("Declaration needs a name");
  const segments: string[] = [type.name];
  for (let ns = type.namespace; ns?.name; ns = ns.namespace) segments.unshift(ns.name);
  if (segments.some(s => !/^[A-Za-z0-9_-]+$/.test(s))) throw new Error(`Invalid output path: ${segments.join("/")}`);
  return segments.map(cIdentifier).join("/");
}
