// Maps language-neutral types to Rust types.
// Returns Children (string or JSX) so model refs can use refkeys for cross-file resolution.

import { type Children, type Refkey } from "@alloy-js/core";
import type { ModelProperty, ScalarType, ArrayType, MapType } from "./00_types.js";

export interface RustType {
  code: Children;         // Rust type expression -- string for scalars, JSX for refs/generics
  externalUses: string[];
}

// Registry of type name -> refkey, built before emission so all types can reference each other
export type RefkeyRegistry = Map<string, Refkey>;

const SCALAR_MAP: Record<string, RustType> = {
  string:      { code: "String", externalUses: [] },
  boolean:     { code: "bool", externalUses: [] },
  int8:        { code: "i8", externalUses: [] },
  int16:       { code: "i16", externalUses: [] },
  int32:       { code: "i32", externalUses: [] },
  int64:       { code: "i64", externalUses: [] },
  uint8:       { code: "u8", externalUses: [] },
  uint16:      { code: "u16", externalUses: [] },
  uint32:      { code: "u32", externalUses: [] },
  uint64:      { code: "u64", externalUses: [] },
  float32:     { code: "f32", externalUses: [] },
  float64:     { code: "f64", externalUses: [] },
  bytes:       { code: "Vec<u8>", externalUses: [] },
  utcDateTime: { code: "DateTime<Utc>", externalUses: ["chrono::DateTime", "chrono::Utc"] },
  plainDate:   { code: "NaiveDate", externalUses: ["chrono::NaiveDate"] },
  plainTime:   { code: "NaiveTime", externalUses: ["chrono::NaiveTime"] },
  duration:       { code: "Duration", externalUses: ["std::time::Duration"] },
  url:            { code: "String", externalUses: [] },
  uuid:           { code: "Uuid", externalUses: ["uuid::Uuid"] },
  decimal:        { code: "Decimal", externalUses: ["rust_decimal::Decimal"] },
  decimal128:     { code: "Decimal", externalUses: ["rust_decimal::Decimal"] },
  integer:        { code: "i64", externalUses: [] },
  float:          { code: "f64", externalUses: [] },
  numeric:        { code: "f64", externalUses: [] },
  safeint:        { code: "i64", externalUses: [] },
  offsetDateTime: { code: "DateTime<FixedOffset>", externalUses: ["chrono::DateTime", "chrono::FixedOffset"] },
};

export function mapType(type: ModelProperty["type"], registry: RefkeyRegistry): RustType {
  switch (type.kind) {
    case "scalar":
      return mapScalar(type);
    case "array": {
      const inner = mapType(type.element, registry);
      return { code: <>Vec&lt;{inner.code}&gt;</>, externalUses: inner.externalUses };
    }
    case "map": {
      const key = mapType(type.key, registry);
      const val = mapType(type.value, registry);
      return {
        code: <>HashMap&lt;{key.code}, {val.code}&gt;</>,
        externalUses: ["std::collections::HashMap", ...key.externalUses, ...val.externalUses],
      };
    }
    case "model":
    case "enum": {
      const rk = registry.get(type.name);
      if (rk) {
        // Refkey -- Alloy's Reference component resolves this to the right name
        // and auto-generates `use crate::...` if cross-file
        return { code: rk, externalUses: [] };
      }
      // Fallback: unregistered type, emit as raw string
      return { code: type.name, externalUses: [] };
    }
  }
}

function mapScalar(type: ScalarType): RustType {
  const mapped = SCALAR_MAP[type.name];
  if (mapped) return mapped;
  return { code: type.name, externalUses: [] };
}

export function wrapOptional(rt: RustType): RustType {
  return { code: <>Option&lt;{rt.code}&gt;</>, externalUses: rt.externalUses };
}
