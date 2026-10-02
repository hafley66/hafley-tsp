import { refkey, type Children } from "@alloy-js/core";
import { type Model, type ModelProperty, type Program, type Type } from "@typespec/compiler";
import { TypeIdentifier } from "../gen/0_nodes.js";

const primitives: Record<string, string> = {
  string: "char *", boolean: "bool", int8: "int8_t", int16: "int16_t", int32: "int32_t", int64: "int64_t",
  uint8: "uint8_t", uint16: "uint16_t", uint32: "uint32_t", uint64: "uint64_t", float32: "float", float64: "double",
};
export const keyOf = (type: Type) => refkey(type);
export function typeOf(program: Program, type: Type): Children {
  switch (type.kind) {
    case "Scalar":
      if (program.checker.isStdType(type)) {
        const c = primitives[type.name];
        if (!c) throw new Error(`Unsupported scalar: ${type.name}`);
        return c;
      }
      return <TypeIdentifier>{keyOf(type)}</TypeIdentifier>;
    case "Enum": case "Interface": return <TypeIdentifier>{keyOf(type)}</TypeIdentifier>;
    case "Union": return <>{keyOf(type)} *</>;
    case "Model":
      if (!type.name || type.indexer) throw new Error("Anonymous models, arrays and records require a named C representation");
      return <>{keyOf(type)} *</>;
    case "Intrinsic": if (type.name === "void") return "void";
  }
  throw new Error(`Unsupported C type: ${type.kind}`);
}
export function isString(type: Type): boolean {
  if (type.kind !== "Scalar") return false;
  for (let scalar: typeof type | undefined = type; scalar; scalar = scalar.baseScalar) {
    if (scalar.name === "string" && scalar.namespace?.name === "TypeSpec") return true;
  }
  return false;
}
export function fieldsOf(model: Model): ModelProperty[] {
  return [...(model.baseModel ? fieldsOf(model.baseModel) : []), ...model.properties.values()];
}
// An allocated object's pointer graph is copied into the destination heap.
export function copyValue(type: Type, expression: string): Children {
  if (isString(type)) return `${expression} ? mi_heap_strdup(arena, ${expression}) : NULL`;
  if (type.kind === "Model" || type.kind === "Union" || type.kind === "Interface") {
    return <>{keyOf(type)}_create(arena, {(type.kind === "Model" || type.kind === "Union") ? expression : `&(${expression})`})</>;
  }
  return expression;
}
