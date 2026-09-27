// Converts TypeSpec compiler types to the neutral TypeDef[] consumed by emitCrate().
// Walks models and enums from a Namespace, resolves scalar chains, maps property types.

import type {
  Model,
  ModelProperty as TspModelProperty,
  Enum as TspEnum,
  Scalar,
  Type,
  Namespace,
  Value,
  Program,
} from "@typespec/compiler";
import { getMinValue, getMaxValue, getMinItems, resolveEncodedName } from "@typespec/compiler";
import { isStream } from "@typespec/streams";
import { getClapArg, getClapModel } from "../../../decorator-def/src/clap.js";

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
  ParamValue,
} from "../emitter/00_types.js";

export type DocOf = (type: Type) => string | undefined;

export function cliOf(program: Program, prop: TspModelProperty): ModelProperty["cli"] {
  const extra = getClapArg(program, prop);
  const encoded = resolveEncodedName(program, prop, "application/x-clap");
  const minValue = getMinValue(program, prop) ?? (prop.type.kind === "Scalar" ? getMinValue(program, prop.type) : undefined);
  const maxValue = getMaxValue(program, prop) ?? (prop.type.kind === "Scalar" ? getMaxValue(program, prop.type) : undefined);
  const minItems = getMinItems(program, prop);
  const cli = {
    ...(encoded !== prop.name ? { long: encoded } : {}),
    ...extra,
    ...(minValue !== undefined ? { minValue } : {}),
    ...(maxValue !== undefined ? { maxValue } : {}),
    ...(minItems !== undefined && minItems >= 1 ? { required: true } : {}),
  };
  return Object.keys(cli).length ? cli : undefined;
}

// Resolve a Scalar by walking baseScalar: `scalar uuid extends string` -> "string".
// A real program stops at the first TypeSpec stdlib scalar (uint32 stays uint32).
function resolveScalarName(scalar: Scalar): string {
  let current = scalar;
  while (current.baseScalar && current.namespace?.name !== "TypeSpec") {
    current = current.baseScalar;
  }
  return current.name;
}

// A scalar declared outside the TypeSpec stdlib keeps its own name as `alias`.
function scalarAlias(scalar: Scalar): string | undefined {
  const ns = scalar.namespace;
  return ns && ns.name !== "TypeSpec" && scalar.baseScalar ? scalar.name : undefined;
}

export function paramValue(value: Value | undefined): ParamValue | undefined {
  switch (value?.valueKind) {
    case "StringValue": return value.value;
    case "BooleanValue": return value.value;
    case "NumericValue": return value.value.asNumber() ?? undefined;
    case "EnumValue": return value.value.name;
    default: return undefined;
  }
}

// Map a TypeSpec Type to our neutral type representation.
export function mapPropertyType(type: Type): ModelProperty["type"] {
  switch (type.kind) {
    case "Scalar": {
      const alias = scalarAlias(type as Scalar);
      const name = resolveScalarName(type as Scalar);
      return (alias ? { kind: "scalar", name, alias } : { kind: "scalar", name }) satisfies ScalarType;
    }

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

function convertModel(model: Model, docOf?: DocOf, program?: Program): ModelDef {
  const properties: ModelProperty[] = [];
  for (const [, prop] of model.properties) {
    const doc = docOf?.(prop);
    const value = paramValue(prop.defaultValue);
    const cli = program ? cliOf(program, prop) : undefined;
    properties.push({
      name: prop.name,
      type: mapPropertyType(prop.type),
      optional: prop.optional || undefined,
      ...(doc !== undefined ? { doc } : {}),
      ...(value !== undefined ? { default: value } : {}),
      ...(cli ? { cli } : {}),
    });
  }
  const clap = program ? getClapModel(program, model) : undefined;
  return { kind: "model", name: model.name, properties, ...(clap?.requiredOneOf ? { requiredOneOf: clap.requiredOneOf, requiredOneOfName: clap.requiredOneOfName } : {}) };
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
  docOf?: DocOf;
  program?: Program;
}

export function namespaceToTypeDefs(
  ns: Namespace,
  options: ConvertOptions = {},
): TypeDef[] {
  const defs: TypeDef[] = [];

  for (const [, model] of ns.models) {
    // Skip anonymous/template models
    if (!model.name || model.name === "") continue;
    if (options.program && isStream(options.program, model)) continue;
    defs.push(convertModel(model, options.docOf, options.program));
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
  docOf?: DocOf,
): TypeDef[] {
  const globalNs = program.getGlobalNamespaceType();
  const defs: TypeDef[] = [];

  // Decorator declarations are metadata, not domain types.
  for (const [name, childNs] of globalNs.namespaces) {
    if (name === "TypeSpec" || name === "DecoratorDef" || name === "Clap" || name === "Daemon") continue;
    defs.push(...namespaceToTypeDefs(childNs, { recursive: true, docOf, ...( "stateMap" in program ? { program: program as Program } : {}) }));
  }

  // Also collect top-level (un-namespaced) types
  defs.push(...namespaceToTypeDefs(globalNs, { docOf, ...( "stateMap" in program ? { program: program as Program } : {}) }));

  return defs;
}
