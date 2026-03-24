/**
 * Reads @decoratorDef-annotated models from a compiled TypeSpec program
 * and produces a LibrarySpec for code generation.
 */

import type { Model, Namespace, Program } from "@typespec/compiler";
import { getDecoratorDef, type DecoratorDefData } from "./decorators.js";

export interface ParamSpec {
  name: string;
  type: string;
  optional?: boolean;
  doc?: string;
}

export interface DecoratorSpec {
  name: string;
  targets: string;
  shape: DecoratorDefData["shape"];
  params: ParamSpec[];
  exclusiveKey?: string;
  exclusiveValue?: string;
  doc?: string;
}

export interface LibrarySpec {
  namespace: string;
  decorators: DecoratorSpec[];
}

function scalarToTspType(typeName: string): string {
  // Map TypeSpec scalar names to the param type strings
  switch (typeName) {
    case "string": return "string";
    case "boolean": return "boolean";
    case "int32": return "int32";
    case "int64": return "int64";
    case "float32":
    case "float64": return "float64";
    default: return typeName;
  }
}

function resolvePropertyType(type: any): string {
  if (type.kind === "Scalar") return scalarToTspType(type.name);
  if (type.kind === "Model") return type.name;
  if (type.kind === "Enum") return type.name;
  return "string";
}

function readModel(program: Program, model: Model): DecoratorSpec | null {
  const data = getDecoratorDef(program, model);
  if (!data) return null;

  const params: ParamSpec[] = [];
  for (const [, prop] of model.properties) {
    params.push({
      name: prop.name,
      type: resolvePropertyType(prop.type),
      optional: prop.optional || undefined,
      doc: undefined, // could read @doc decorator here
    });
  }

  return {
    name: model.name,
    targets: data.targets,
    shape: data.shape,
    params,
    exclusiveKey: data.exclusiveKey,
    exclusiveValue: data.exclusiveValue,
    doc: data.doc,
  };
}

function walkNamespace(program: Program, ns: Namespace, specs: DecoratorSpec[]) {
  for (const [, model] of ns.models) {
    const spec = readModel(program, model);
    if (spec) specs.push(spec);
  }
  for (const [, childNs] of ns.namespaces) {
    walkNamespace(program, childNs, specs);
  }
}

export function readLibrarySpec(program: Program, namespaceName: string): LibrarySpec {
  const globalNs = program.getGlobalNamespaceType();
  const specs: DecoratorSpec[] = [];

  for (const [name, ns] of globalNs.namespaces) {
    if (name === "TypeSpec" || name === "DecoratorDef") continue;
    walkNamespace(program, ns, specs);
  }
  // Also check top-level models
  for (const [, model] of globalNs.models) {
    const spec = readModel(program, model);
    if (spec) specs.push(spec);
  }

  return { namespace: namespaceName, decorators: specs };
}
