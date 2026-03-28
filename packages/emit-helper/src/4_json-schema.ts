// JSON Schema TargetLang: TypeDef[] → JSON Schema objects.

import type { TargetLang, MappedField, MappedMember } from "./1_target.js";

export interface JsonSchemaType {
  type?: string;
  format?: string;
  items?: JsonSchemaType;
  additionalProperties?: JsonSchemaType;
  $ref?: string;
  enum?: (string | number)[];
  oneOf?: JsonSchemaType[];
}

export interface JsonSchemaDecl {
  $id: string;
  type: string;
  description?: string;
  properties?: Record<string, JsonSchemaType>;
  required?: string[];
  enum?: (string | number)[];
}

const SCALAR_MAP: Record<string, JsonSchemaType> = {
  string:   { type: "string" },
  boolean:  { type: "boolean" },
  int8:     { type: "integer", format: "int8" },
  int16:    { type: "integer", format: "int16" },
  int32:    { type: "integer", format: "int32" },
  int64:    { type: "integer", format: "int64" },
  uint8:    { type: "integer", format: "uint8" },
  uint16:   { type: "integer", format: "uint16" },
  uint32:   { type: "integer", format: "uint32" },
  uint64:   { type: "integer", format: "uint64" },
  float32:  { type: "number", format: "float" },
  float64:  { type: "number", format: "double" },
  float:    { type: "number", format: "double" },
  integer:  { type: "integer" },
  numeric:  { type: "number" },
  safeint:  { type: "integer" },
  bytes:    { type: "string", format: "byte" },
  utcDateTime:    { type: "string", format: "date-time" },
  plainDate:      { type: "string", format: "date" },
  plainTime:      { type: "string", format: "time" },
  duration:       { type: "string", format: "duration" },
  url:            { type: "string", format: "uri" },
  uuid:           { type: "string", format: "uuid" },
  decimal:        { type: "string", format: "decimal" },
  decimal128:     { type: "string", format: "decimal" },
  offsetDateTime: { type: "string", format: "date-time" },
};

function toCamelCase(name: string): string {
  return name
    .split(/[_\s-]+/)
    .map((w, i) => i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");
}

export const jsonSchemaTarget: TargetLang<JsonSchemaType, JsonSchemaDecl> = {
  typeName(name) { return name; },
  fieldName: toCamelCase,
  memberName(name) { return name; },

  scalar(name) {
    return SCALAR_MAP[name] ?? { type: "string" };
  },

  optional(inner) {
    // JSON Schema handles optionality via required[], not the type itself.
    // Return the inner type unchanged -- optionality is tracked in MappedField.optional
    return inner;
  },

  array(inner) {
    return { type: "array", items: inner };
  },

  map(_key, value) {
    return { type: "object", additionalProperties: value };
  },

  ref(name) {
    return { $ref: `#/$defs/${name}` };
  },

  model(name, fields, doc) {
    const properties: Record<string, JsonSchemaType> = {};
    const required: string[] = [];

    for (const f of fields) {
      properties[f.name] = f.type;
      if (!f.optional) {
        required.push(f.name);
      }
    }

    const decl: JsonSchemaDecl = {
      $id: name,
      type: "object",
      properties,
    };
    if (required.length > 0) decl.required = required;
    if (doc) decl.description = doc;
    return decl;
  },

  enum(name, members, doc) {
    const values = members.map(m => m.value ?? m.name);
    const decl: JsonSchemaDecl = {
      $id: name,
      type: typeof values[0] === "number" ? "number" : "string",
      enum: values,
    };
    if (doc) decl.description = doc;
    return decl;
  },
};
