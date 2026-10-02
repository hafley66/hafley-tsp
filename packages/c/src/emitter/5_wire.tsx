import type { Children } from "@alloy-js/core";
import type { Model, Program, Scalar, Type } from "@typespec/compiler";
import { cIdentifier } from "../c/0_name-policy.js";
import { SourceFile } from "../c/3_SourceFile.js";
import type { Declaration } from "./0_types.js";
import { fieldsOf, isString, keyOf, nullableInner, pointerValue, inlineCollection } from "./1_type_map.js";
import { cString } from "./4_store.js";

function named(type: { name?: string | undefined }): string {
  if (!type.name) throw new Error("JSON codec needs a named type");
  return cIdentifier(type.name);
}

function scalarName(type: Scalar): string {
  while (type.baseScalar && type.namespace?.name !== "TypeSpec") type = type.baseScalar;
  return type.name;
}

class Codec {
  serial = 0;
  fresh(prefix: string) { return `${prefix}_${this.serial++}`; }
  encode(type: Type, value: string, target: string): string {
    const inner = nullableInner(type);
    if (inner) return `if (!${value}) ${target} = yyjson_mut_null(doc); else {\n${this.encode(inner, pointerValue(inner) ? value : `(*${value})`, target)}}\n`;
    if (inlineCollection(type)) return this.encodeCollection(type, value, target);
    if (type.kind === "Model" || type.kind === "Union") return `${target} = ${named(type)}_json_value(doc, ${value});\n`;
    if (type.kind === "Intrinsic" && type.name === "unknown") {
      const parsed = this.fresh("parsed");
      return `if (!${value}) return NULL;\nyyjson_doc *${parsed} = yyjson_read_opts((char *)(void *)${value}, strlen(${value}), 0, &doc->alc, NULL);\nif (!${parsed}) return NULL;\n${target} = yyjson_val_mut_copy(doc, yyjson_doc_get_root(${parsed}));\n`;
    }
    if (type.kind === "Enum") {
      const text = this.fresh("text");
      return `const char *${text} = ${cIdentifier(type.name)}_to_string(${value});\nif (!${text}) return NULL;\n${target} = yyjson_mut_strcpy(doc, ${text});\n`;
    }
    if (isString(type)) return `if (!${value}${type.kind === "String" ? ` || strcmp(${value}, ${cString(type.value)}) != 0` : ""}) return NULL;\n${target} = yyjson_mut_strcpy(doc, ${value});\n`;
    const scalar = type.kind === "Scalar" ? scalarName(type) : type.kind === "Boolean" ? "boolean" : type.kind === "Number" ? "float64" : "";
    const constructor = scalar === "boolean" ? "bool" : scalar.startsWith("uint") ? "uint" : scalar.startsWith("int") ? "sint" : scalar.startsWith("float") ? "real" : undefined;
    if (!constructor) throw new Error(`Unsupported JSON value: ${type.kind}${"name" in type ? ` ${String(type.name)}` : ""}`);
    return `${type.kind === "Boolean" || type.kind === "Number" ? `if (${value} != ${type.value}) return NULL;\n` : ""}${target} = yyjson_mut_${constructor}(doc, ${value});\n`;
  }
  decode(type: Type, source: string, target: string): string {
    const inner = nullableInner(type);
    if (inner) {
      if (pointerValue(inner)) return `if (yyjson_is_null(${source})) ${target} = NULL; else {\n${this.decode(inner, source, target)}}\n`;
      return `if (yyjson_is_null(${source})) ${target} = NULL; else {\n${target} = mi_heap_malloc(arena, sizeof(*${target}));\nif (!${target}) return NULL;\n${this.decode(inner, source, `(*${target})`)}}\n`;
    }
    if (inlineCollection(type)) return this.decodeCollection(type, source, target);
    if (type.kind === "Model" || type.kind === "Union") return `${target} = ${named(type)}_json_read(arena, ${source});\nif (!${target}) return NULL;\n`;
    if (type.kind === "Intrinsic" && type.name === "unknown") {
      const allocator = this.fresh("alc");
      return `yyjson_alc ${allocator} = alloy_c_json_allocator(arena);\n${target} = yyjson_val_write_opts(${source}, 0, &${allocator}, NULL, NULL);\nif (!${target}) return NULL;\n`;
    }
    if (type.kind === "Enum") {
      const result = this.fresh("enum_value");
      return `if (!yyjson_is_str(${source}) || strlen(yyjson_get_str(${source})) != yyjson_get_len(${source})) return NULL;\n${cIdentifier(type.name)} *${result} = ${cIdentifier(type.name)}_from_string(arena, yyjson_get_str(${source}));\nif (!${result}) return NULL;\n${target} = *${result};\n`;
    }
    if (isString(type)) {
      const literal = type.kind === "String" ? `if (strcmp(yyjson_get_str(${source}), ${cString(type.value)}) != 0) return NULL;\n` : "";
      return `if (!yyjson_is_str(${source}) || strlen(yyjson_get_str(${source})) != yyjson_get_len(${source})) return NULL;\n${literal}${target} = mi_heap_strdup(arena, yyjson_get_str(${source}));\nif (!${target}) return NULL;\n`;
    }
    const scalar = type.kind === "Scalar" ? scalarName(type) : type.kind === "Boolean" ? "boolean" : type.kind === "Number" ? "float64" : "";
    if (scalar === "boolean") return `if (!yyjson_is_bool(${source})) return NULL;\n${target} = yyjson_get_bool(${source});\n${type.kind === "Boolean" ? `if (${target} != ${type.value}) return NULL;\n` : ""}`;
    if (scalar.startsWith("float")) return `if (!yyjson_is_num(${source})${scalar === "float32" ? ` || yyjson_get_num(${source}) < -FLT_MAX || yyjson_get_num(${source}) > FLT_MAX` : ""}) return NULL;\n${target} = yyjson_get_num(${source});\n${type.kind === "Number" ? `if (${target} != ${type.value}) return NULL;\n` : ""}`;
    if (/^u?int\d+$/.test(scalar)) {
      const bits = Number(scalar.match(/\d+/)![0]);
      if (scalar.startsWith("uint")) return `if (!yyjson_is_uint(${source})${bits < 64 ? ` || yyjson_get_uint(${source}) > UINT${bits}_MAX` : ""}) return NULL;\n${target} = yyjson_get_uint(${source});\n`;
      return `if (!yyjson_is_int(${source}) || (yyjson_is_uint(${source}) && yyjson_get_uint(${source}) > INT64_MAX)${bits < 64 ? ` || yyjson_get_sint(${source}) < INT${bits}_MIN || yyjson_get_sint(${source}) > INT${bits}_MAX` : ""}) return NULL;\n${target} = yyjson_get_sint(${source});\n`;
    }
    throw new Error(`Unsupported JSON value: ${type.kind}${"name" in type ? ` ${String(type.name)}` : ""}`);
  }
  encodeCollection(type: Model, value: string, target: string): string {
    if (!type.indexer) throw new Error("Collection needs indexer");
    const map = type.indexer.key.name === "string", i = this.fresh("i"), item = this.fresh("item");
    const expression = `${value}.items[${i}]${map ? ".value" : ""}`;
    return `${target} = yyjson_mut_${map ? "obj" : "arr"}(doc);\nif (!${target} || (${value}.count && !${value}.items)) return NULL;\nfor (size_t ${i} = 0; ${i} < ${value}.count; ++${i}) {\n  yyjson_mut_val *${item} = NULL;\n${this.encode(type.indexer.value, expression, item)}${map ? `if (!${value}.items[${i}].key || !${item} || !yyjson_mut_obj_add_val(doc, ${target}, ${value}.items[${i}].key, ${item})) return NULL;\n` : `if (!${item} || !yyjson_mut_arr_append(${target}, ${item})) return NULL;\n`} }\n`;
  }
  decodeCollection(type: Model, source: string, target: string): string {
    if (!type.indexer) throw new Error("Collection needs indexer");
    const map = type.indexer.key.name === "string", i = this.fresh("i");
    let code = `if (!yyjson_is_${map ? "obj" : "arr"}(${source})) return NULL;\n${target}.count = yyjson_${map ? "obj" : "arr"}_size(${source});\nif (${target}.count > SIZE_MAX / sizeof(*${target}.items)) return NULL;\nif (${target}.count) {\n${target}.items = mi_heap_zalloc(arena, ${target}.count * sizeof(*${target}.items));\nif (!${target}.items) return NULL;\n}\n`;
    if (map) {
      const max = this.fresh("max"), key = this.fresh("key"), val = this.fresh("val");
      code += `size_t ${i}, ${max}; yyjson_val *${key}, *${val};\nyyjson_obj_foreach(${source}, ${i}, ${max}, ${key}, ${val}) {\nif (strlen(yyjson_get_str(${key})) != yyjson_get_len(${key})) return NULL;\n${target}.items[${i}].key = mi_heap_strdup(arena, yyjson_get_str(${key}));\nif (!${target}.items[${i}].key) return NULL;\n${this.decode(type.indexer.value, val, `${target}.items[${i}].value`)} }\n`;
    } else code += `for (size_t ${i} = 0; ${i} < ${target}.count; ++${i}) {\n${this.decode(type.indexer.value, `yyjson_arr_get(${source}, ${i})`, `${target}.items[${i}]`)} }\n`;
    return code;
  }

}

function implementation(type: Extract<Declaration, { kind: "Model" | "Union" }>): string {
  const name = named(type), codec = new Codec();
  let encode = "", decode = "";
  if (type.kind === "Model" && type.indexer) {
    encode = codec.encodeCollection(type, "(*input)", "obj");
    decode = codec.decodeCollection(type, "obj", "(*out)");
  } else if (type.kind === "Model") {
    for (const field of fieldsOf(type)) {
      const id = cIdentifier(field.name), val = codec.fresh("value"), member = codec.fresh("member");
      encode += `${field.optional ? `if (input->has_${id}) {\n` : ""}yyjson_mut_val *${val} = NULL;\n${codec.encode(field.type, `input->${id}`, val)}if (!${val} || !yyjson_mut_obj_add_val(doc, obj, ${cString(field.name)}, ${val})) return NULL;\n${field.optional ? "}\n" : ""}`;
      decode += `yyjson_val *${member} = yyjson_obj_get(obj, ${cString(field.name)});\n${field.optional ? `out->has_${id} = ${member} != NULL;\nif (${member}) {\n` : `if (!${member}) return NULL;\n`}${codec.decode(field.type, member, `out->${id}`)}${field.optional ? "}\n" : ""}`;
    }
  } else {
    encode += `const char *tag = ${name}_tag_to_string(input->tag);\nif (!tag || !yyjson_mut_obj_add_str(doc, obj, "tag", tag)) return NULL;\nyyjson_mut_val *value = NULL;\nswitch (input->tag) {\n`;
    decode += `yyjson_val *tag = yyjson_obj_get(obj, "tag");\nyyjson_val *value = yyjson_obj_get(obj, "value");\nif (!yyjson_is_str(tag) || !value || strlen(yyjson_get_str(tag)) != yyjson_get_len(tag)) return NULL;\n`;
    let index = 0;
    for (const variant of type.variants.values()) {
      if (typeof variant.name !== "string") throw new Error(`Union ${name} requires named variants`);
      const id = cIdentifier(variant.name), isNull = variant.type.kind === "Intrinsic" && variant.type.name === "null";
      encode += `case ${name}_tag_${id}: {\n${isNull ? "value = yyjson_mut_null(doc);\n" : codec.encode(variant.type, `input->value.${id}`, "value")}break;\n}\n`;
      decode += `${index++ ? "else " : ""}if (strcmp(yyjson_get_str(tag), ${cString(variant.name)}) == 0) {\nout->tag = ${name}_tag_${id};\n${isNull ? "if (!yyjson_is_null(value)) return NULL;\n" : codec.decode(variant.type, "value", `out->value.${id}`)}}\n`;
    }
    encode += `}\nif (!value || !yyjson_mut_obj_add_val(doc, obj, "value", value)) return NULL;\n`;
    decode += "else return NULL;\n";
  }
  return `yyjson_mut_val *${name}_json_value(yyjson_mut_doc *doc, const ${name} *input) {\n  if (!doc || !input) return NULL;\n  yyjson_mut_val *obj = ${type.kind === "Model" && type.indexer ? "NULL" : "yyjson_mut_obj(doc)"};\n  ${type.kind === "Model" && type.indexer ? "" : "if (!obj) return NULL;"}\n${encode}  return obj;\n}\n\n${name} *${name}_json_read(mi_heap_t *arena, yyjson_val *obj) {\n  if (!arena${type.kind === "Model" && type.indexer ? "" : " || !yyjson_is_obj(obj)"}) return NULL;\n  ${name} *out = mi_heap_zalloc(arena, sizeof(*out));\n  if (!out) return NULL;\n${decode}  return out;\n}\n\nchar *${name}_json_encode(mi_heap_t *arena, const ${name} *input) {\n  if (!arena) return NULL;\n  yyjson_alc alc = alloy_c_json_allocator(arena);\n  yyjson_mut_doc *doc = yyjson_mut_doc_new(&alc);\n  if (!doc) return NULL;\n  yyjson_mut_val *value = ${name}_json_value(doc, input);\n  if (!value) return NULL;\n  yyjson_mut_doc_set_root(doc, value);\n  return yyjson_mut_write_opts(doc, 0, &alc, NULL, NULL);\n}\n\n${name} *${name}_json_decode(mi_heap_t *arena, const char *json, size_t length) {\n  if (!arena || !json) return NULL;\n  yyjson_alc alc = alloy_c_json_allocator(arena);\n  yyjson_doc *doc = yyjson_read_opts((char *)(void *)json, length, 0, &alc, NULL);\n  return doc ? ${name}_json_read(arena, yyjson_doc_get_root(doc)) : NULL;\n}\n`;
}

// Rendered in the same Alloy output as declarations so type references install
// their cross-file includes through the binder.
export function WireFiles(props: { program: Program; types: Declaration[] }): Children {
  const types = props.types.filter((t): t is Extract<Declaration, { kind: "Model" | "Union" }> => t.kind === "Model" || t.kind === "Union");
  if (!types.length) return null;
  return <>
    <SourceFile path="wire_auto.h" preamble={'#pragma once\n#include <yyjson.h>\n#include <mimalloc.h>\n#include <stddef.h>\n'}>
      {types.map(type => <>
        yyjson_mut_val *{named(type)}_json_value(yyjson_mut_doc *doc, const {keyOf(type)} *input);<hbr />
        {keyOf(type)} *{named(type)}_json_read(mi_heap_t *arena, yyjson_val *obj);<hbr />
        char *{named(type)}_json_encode(mi_heap_t *arena, const {keyOf(type)} *input);<hbr />
        {keyOf(type)} *{named(type)}_json_decode(mi_heap_t *arena, const char *json, size_t length);<hbr />
      </>)}
    </SourceFile>
    <SourceFile path="wire_auto.c">
      {'#include "wire_auto.h"\n#include <string.h>\n#include <limits.h>\n#include <float.h>\n\nstatic void *alloy_c_json_malloc(void *ctx, size_t size) { return mi_heap_malloc(ctx, size); }\nstatic void *alloy_c_json_realloc(void *ctx, void *ptr, size_t old_size, size_t size) {\n  (void)old_size; return mi_heap_realloc(ctx, ptr, size);\n}\nstatic void alloy_c_json_free(void *ctx, void *ptr) { (void)ctx; (void)ptr; }\nstatic yyjson_alc alloy_c_json_allocator(mi_heap_t *arena) {\n  return (yyjson_alc){alloy_c_json_malloc, alloy_c_json_realloc, alloy_c_json_free, arena};\n}\n\n'}
      {types.map(implementation)}
    </SourceFile>
  </>;
}
