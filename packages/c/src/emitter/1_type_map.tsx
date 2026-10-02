import { refkey, type Children } from "@alloy-js/core";
import { type Model, type ModelProperty, type Program, type Type } from "@typespec/compiler";
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
export function inlineCollection(type: Type): type is Model & { indexer: NonNullable<Model["indexer"]> } {
  return type.kind === "Model" && !!type.indexer && type.namespace?.name === "TypeSpec";
}
export function collectionFields(program: Program, model: Model): Children {
  if (!model.indexer) throw new Error("Collection needs an indexer");
  return model.indexer.key.name === "string"
    ? <>size_t count; struct {"{"} char *key; {typeOf(program, model.indexer.value)} value; {"}"} *items;</>
    : <>size_t count; {typeOf(program, model.indexer.value)} *items;</>;
}
export function pointerValue(type: Type): boolean {
  return isString(type) || type.kind === "Model" && !inlineCollection(type) || type.kind === "Union" || type.kind === "Intrinsic" && type.name === "unknown";
}
export function typeOf(program: Program, type: Type): Children {
  const inner = nullableInner(type);
  if (inner && inlineCollection(inner)) throw new Error("Nullable inline collections require a named model");
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
    case "Union":
      if (!type.name) throw new Error("Unnamed unions require a nullable value or a named union");
      return <>{keyOf(type)} *</>;
    case "Model":
      if (inlineCollection(type)) return <>struct {"{"} {collectionFields(program, type)} {"}"}</>;
      if (!type.name) throw new Error("Anonymous models, arrays and records require a named C representation");
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

export function copyCollection(type: Model, input: string, output: string, depth = 0): Children {
  if (!type.indexer) throw new Error("Collection needs an indexer");
  const value = type.indexer.value, map = type.indexer.key.name === "string", i = `i_${depth}`;
  const source = `${input}.items[${i}]${map ? ".value" : ""}`;
  const destination = `${output}.items[${i}]${map ? ".value" : ""}`;
  return <>
    {`if (${input}.count) {\n  if (!${input}.items || ${input}.count > SIZE_MAX / sizeof(*${output}.items)) return NULL;\n  ${output}.count = ${input}.count;\n  ${output}.items = mi_heap_zalloc(arena, ${input}.count * sizeof(*${output}.items));\n  if (!${output}.items) return NULL;\n  for (size_t ${i} = 0; ${i} < ${input}.count; ++${i}) {\n`}
    {map && `    if (!${input}.items[${i}].key) return NULL;\n    ${output}.items[${i}].key = mi_heap_strdup(arena, ${input}.items[${i}].key);\n    if (!${output}.items[${i}].key) return NULL;\n`}
    {inlineCollection(value) ? copyCollection(value, source, destination, depth + 1) : <>
      {destination} = {copyValue(value, source)};<hbr />
      {(pointerValue(value) || nullableInner(value)) && `if (${source} && !${destination}) return NULL;\n`}
    </>}
    {"  }\n}\n"}
  </>;
}
