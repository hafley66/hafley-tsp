import { refkey, type Children } from "@alloy-js/core";
import { type Model, type ModelProperty, type Program, type Type } from "@typespec/compiler";
import { cIdentifier } from "../c/0_name-policy.js";
import { TypeIdentifier } from "../gen/0_nodes.js";

const primitives: Record<string, string> = {
  string: "char *", boolean: "bool", int8: "int8_t", int16: "int16_t", int32: "int32_t", int64: "int64_t",
  uint8: "uint8_t", uint16: "uint16_t", uint32: "uint32_t", uint64: "uint64_t", float32: "float", float64: "double",
};
export const keyOf = (type: Type) => refkey(type);
export function nullableInner(type: Type): Type | undefined {
  if (type.kind !== "Union" || type.name) return undefined;
  const variants = [...type.variants.values()].map(v => v.type);
  const values = variants.filter(v => !(v.kind === "Intrinsic" && v.name === "null"));
  return values.length === 1 && values.length < variants.length ? values[0] : undefined;
}
export function pointerValue(type: Type): boolean {
  return isString(type) || type.kind === "Model" && !type.indexer || type.kind === "Union" || type.kind === "Intrinsic" && type.name === "unknown";
}
export function typeOf(program: Program, type: Type): Children {
  const inner = nullableInner(type);
  if (inner) return pointerValue(inner) ? typeOf(program, inner) : <>{typeOf(program, inner)} *</>;
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
      if (type.indexer && type.indexer.key.name === "integer") return <>struct {"{"} size_t count; {typeOf(program, type.indexer.value)} *items; {"}"}</>;
      if (!type.name || type.indexer) throw new Error("Anonymous models, arrays and records require a named C representation");
      return <>{keyOf(type)} *</>;
    case "String": return "char *";
    case "Number": return "double";
    case "Boolean": return "bool";
    case "Intrinsic": if (type.name === "void") return "void"; if (type.name === "unknown") return "char *";
  }
  throw new Error(`Unsupported C type: ${type.kind}`);
}
export function isString(type: Type): boolean {
  if (type.kind === "String") return true;
  const inner = nullableInner(type);
  if (inner) return isString(inner);
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
  const inner = nullableInner(type);
  if (inner) {
    if (pointerValue(inner)) return copyValue(inner, expression);
    return `${expression} ? alloy_c_memdup(arena, ${expression}, sizeof(*${expression})) : NULL`;
  }
  if (type.kind === "Intrinsic" && type.name === "unknown") return `${expression} ? mi_heap_strdup(arena, ${expression}) : NULL`;
  if (isString(type)) return `${expression} ? mi_heap_strdup(arena, ${expression}) : NULL`;
  if (type.kind === "Model" || type.kind === "Union" || type.kind === "Interface") {
    return <>{keyOf(type)}_create(arena, {(type.kind === "Model" || type.kind === "Union") ? expression : `&(${expression})`})</>;
  }
  return expression;
}
