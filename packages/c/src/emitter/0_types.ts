import { cIdentifier } from "../c/0_name-policy.js";
import { isTemplateDeclaration, type Enum, type Interface, type Model, type Namespace, type Program, type Scalar, type Type, type Union } from "@typespec/compiler";

export type Declaration = Scalar | Enum | Model | Union | Interface;

// Anonymous models are declared under a name derived from their site:
// <Owner>_<field>, <Union>_<variant>, <Interface>_<op>_<param|result>,
// <site>_item for collection elements and <site>_<index> for tuple members.
const synthetic = new WeakMap<Type, { name: string; namespace?: Namespace }>();
export function nameOf(type: { name?: string | symbol }): string {
  const name = synthetic.get(type as Type)?.name ?? type.name;
  if (typeof name !== "string" || !name) throw new Error("C declaration needs a name");
  return name;
}
export function isDeclared(type: Type): boolean {
  return synthetic.has(type) || "name" in type && typeof type.name === "string" && !!type.name;
}
function namespaceOf(type: { namespace?: Namespace }): Namespace | undefined {
  return synthetic.get(type as Type)?.namespace ?? type.namespace;
}

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
  const named = [...out];
  function site(type: Type, name: string, ns: Namespace | undefined) {
    if (type.kind === "Tuple") return type.values.forEach((v, i) => site(v, `${name}_${i}`, ns));
    if (type.kind === "Union" && !type.name) return [...type.variants.values()].forEach(v => site(v.type, name, ns));
    if (type.kind !== "Model") return;
    if (type.indexer && type.namespace?.name === "TypeSpec") return site(type.indexer.value, `${name}_item`, ns);
    if (type.name || out.includes(type)) return;
    synthetic.set(type, { name, namespace: ns });
    out.push(type);
    members(type, name, ns);
  }
  function members(type: Declaration, name: string, ns: Namespace | undefined) {
    if (type.kind === "Model") for (const p of type.properties.values()) site(p.type, `${name}_${p.name}`, ns);
    if (type.kind === "Model" && type.indexer) site(type.indexer.value, `${name}_item`, ns);
    if (type.kind === "Union") for (const v of type.variants.values()) if (typeof v.name === "string") site(v.type, `${name}_${v.name}`, ns);
    if (type.kind === "Interface") for (const op of type.operations.values()) {
      site(op.returnType, `${name}_${op.name}_result`, ns);
      for (const p of op.parameters.properties.values()) site(p.type, `${name}_${op.name}_${p.name}`, ns);
    }
  }
  for (const type of named) members(type, type.name!, type.namespace);
  return out;
}
export function pathOf(type: Declaration): string {
  const segments: string[] = [nameOf(type)];
  for (let ns = namespaceOf(type); ns?.name; ns = ns.namespace) segments.unshift(ns.name);
  if (segments.some(s => !/^[A-Za-z0-9_-]+$/.test(s))) throw new Error(`Invalid output path: ${segments.join("/")}`);
  return segments.map(cIdentifier).join("/");
}
// C has one global symbol space: a declaration's symbol is its namespace path
// and name joined by underscores (Boop.User.Tag -> Boop_User_Tag).
export function symbolOf(type: { name?: string | symbol; namespace?: Namespace }): string {
  const segments: string[] = [nameOf(type)];
  for (let ns = namespaceOf(type); ns?.name; ns = ns.namespace) segments.unshift(ns.name);
  return segments.map(cIdentifier).join("_");
}
