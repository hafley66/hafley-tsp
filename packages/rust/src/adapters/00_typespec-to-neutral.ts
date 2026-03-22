// Converts TypeSpec compiler types to the neutral TypeDef[] consumed by emitCrate().
// Walks models and enums from a Namespace, resolves scalar chains, maps property types.

import type {
  Model,
  ModelProperty as TspModelProperty,
  Enum as TspEnum,
  Scalar,
  Type,
  Namespace,
} from "@typespec/compiler";

import type {
  TypeDef,
  ModelDef,
  EnumDef,
  ModelProperty,
  ScalarType,
  ArrayType,
  MapType,
  ModelRef,
  EnumRef,
} from "../emitter/00_types.js";

// Resolve a Scalar's root name by walking baseScalar until we hit a builtin.
// e.g. `scalar uuid extends string` -> "string"
function resolveScalarName(scalar: Scalar): string {
  let current = scalar;
  while (current.baseScalar) {
    current = current.baseScalar;
  }
  return current.name;
}

// Map a TypeSpec Type to our neutral type representation.
function mapPropertyType(type: Type): ModelProperty["type"] {
  switch (type.kind) {
    case "Scalar":
      return { kind: "scalar", name: resolveScalarName(type as Scalar) } satisfies ScalarType;

    case "Enum":
      return { kind: "enum", name: (type as TspEnum).name } satisfies EnumRef;

    case "Model": {
      const model = type as Model;

      // Array: TypeSpec represents `T[]` as Model with name "Array" and a single template arg
      if (model.name === "Array" && model.indexer) {
        return {
          kind: "array",
          element: mapPropertyType(model.indexer.value),
        } satisfies ArrayType;
      }

      // Record<K, V>: TypeSpec represents `Record<string, V>` as Model with name "Record" and indexer
      if (model.name === "Record" && model.indexer) {
        return {
          kind: "map",
          key: { kind: "scalar", name: resolveScalarName(model.indexer.key) },
          value: mapPropertyType(model.indexer.value),
        } satisfies MapType;
      }

      // Regular model reference
      return { kind: "model", name: model.name } satisfies ModelRef;
    }

    // Fallback: treat anything else as a string scalar (unions, literals, etc.)
    default:
      return { kind: "scalar", name: "string" } satisfies ScalarType;
  }
}

function convertModel(model: Model): ModelDef {
  const properties: ModelProperty[] = [];
  for (const [, prop] of model.properties) {
    properties.push({
      name: prop.name,
      type: mapPropertyType(prop.type),
      optional: prop.optional || undefined,
    });
  }
  return { kind: "model", name: model.name, properties };
}

function convertEnum(tspEnum: TspEnum): EnumDef {
  const members = Array.from(tspEnum.members.values()).map(m => ({
    name: m.name,
    value: m.value,
  }));
  return { kind: "enum", name: tspEnum.name, members };
}

// Collect all models and enums from a namespace, optionally recursing into sub-namespaces.
export interface ConvertOptions {
  recursive?: boolean;
}

export function namespaceToTypeDefs(
  ns: Namespace,
  options: ConvertOptions = {},
): TypeDef[] {
  const defs: TypeDef[] = [];

  for (const [, model] of ns.models) {
    // Skip anonymous/template models
    if (!model.name || model.name === "") continue;
    defs.push(convertModel(model));
  }

  for (const [, tspEnum] of ns.enums) {
    defs.push(convertEnum(tspEnum));
  }

  if (options.recursive) {
    for (const [, childNs] of ns.namespaces) {
      defs.push(...namespaceToTypeDefs(childNs, options));
    }
  }

  return defs;
}

// Convenience: extract from a Program's global namespace.
// Filters out TypeSpec stdlib types (TypeSpec.* namespace).
export function programToTypeDefs(
  program: { getGlobalNamespaceType(): Namespace },
): TypeDef[] {
  const globalNs = program.getGlobalNamespaceType();
  const defs: TypeDef[] = [];

  // Collect from user-defined namespaces (skip "TypeSpec" stdlib namespace)
  for (const [name, childNs] of globalNs.namespaces) {
    if (name === "TypeSpec") continue;
    defs.push(...namespaceToTypeDefs(childNs, { recursive: true }));
  }

  // Also collect top-level (un-namespaced) types
  defs.push(...namespaceToTypeDefs(globalNs));

  return defs;
}
