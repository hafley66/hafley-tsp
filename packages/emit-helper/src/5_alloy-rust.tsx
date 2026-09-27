// Alloy-backed Rust target: TType = RustType (Children + uses), TDecl = Children (JSX).
// Plugs into the same TargetLang interface but produces Alloy render trees
// with refkeys for cross-file reference resolution.

import { List, refkey, type Children, type Refkey } from "@alloy-js/core";
import type { TargetLang, MappedField, MappedMember } from "./1_target.js";

export interface RustType {
  code: Children;
  uses: string[];
}

export interface AlloyRustDecl {
  name: string;
  refkey: Refkey;
  jsx: Children;
  uses: string[];
}

// Registry mapping type names → refkeys, built before emission.
export type RefkeyRegistry = Map<string, Refkey>;

const SCALAR_MAP: Record<string, RustType> = {
  string:      { code: "String", uses: [] },
  boolean:     { code: "bool", uses: [] },
  int8:        { code: "i8", uses: [] },
  int16:       { code: "i16", uses: [] },
  int32:       { code: "i32", uses: [] },
  int64:       { code: "i64", uses: [] },
  uint8:       { code: "u8", uses: [] },
  uint16:      { code: "u16", uses: [] },
  uint32:      { code: "u32", uses: [] },
  uint64:      { code: "u64", uses: [] },
  float32:     { code: "f32", uses: [] },
  float64:     { code: "f64", uses: [] },
  float:       { code: "f64", uses: [] },
  integer:     { code: "i64", uses: [] },
  numeric:     { code: "f64", uses: [] },
  safeint:     { code: "i64", uses: [] },
  bytes:       { code: "Vec<u8>", uses: [] },
  utcDateTime: { code: "DateTime<Utc>", uses: ["chrono::DateTime", "chrono::Utc"] },
  plainDate:   { code: "NaiveDate", uses: ["chrono::NaiveDate"] },
  plainTime:   { code: "NaiveTime", uses: ["chrono::NaiveTime"] },
  duration:    { code: "Duration", uses: ["std::time::Duration"] },
  url:         { code: "String", uses: [] },
  uuid:        { code: "Uuid", uses: ["uuid::Uuid"] },
  decimal:     { code: "Decimal", uses: ["rust_decimal::Decimal"] },
  decimal128:  { code: "Decimal", uses: ["rust_decimal::Decimal"] },
  offsetDateTime: { code: "DateTime<FixedOffset>", uses: ["chrono::DateTime", "chrono::FixedOffset"] },
};

function toSnakeCase(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();
}

function toPascalCase(name: string): string {
  return name.split(/[_\s-]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join("");
}

// Create an Alloy Rust target bound to a pre-built refkey registry.
// Call buildRegistry() first to allocate refkeys, then pass it here.
export function createAlloyRustTarget(registry: RefkeyRegistry): TargetLang<RustType, AlloyRustDecl> {
  return {
    typeName: toPascalCase,
    fieldName: toSnakeCase,
    memberName: toPascalCase,

    scalar(name) {
      return SCALAR_MAP[name] ?? { code: name, uses: [] };
    },

    optional(inner) {
      return { code: <>Option&lt;{inner.code}&gt;</>, uses: inner.uses };
    },

    array(inner) {
      return { code: <>Vec&lt;{inner.code}&gt;</>, uses: inner.uses };
    },

    map(key, value) {
      return {
        code: <>HashMap&lt;{key.code}, {value.code}&gt;</>,
        uses: ["std::collections::HashMap", ...key.uses, ...value.uses],
      };
    },

    ref(name) {
      const rk = registry.get(name);
      if (rk) return { code: rk, uses: [] };
      return { code: toPascalCase(name), uses: [] };
    },

    model(name, fields, doc) {
      const rk = registry.get(name) ?? refkey();
      const allUses = new Set(["serde::Serialize", "serde::Deserialize"]);
      for (const f of fields) {
        for (const u of f.type.uses) allUses.add(u);
      }

      // The JSX here uses whatever Rust declaration components are available.
      // This is the shape -- the actual components come from @hafley66/alloy-rs.
      const jsx = (
        <>
          {fields.map(f => (
            <>{f.name}: {f.type.code},{"\n"}</>
          ))}
        </>
      );

      return {
        name,
        refkey: rk,
        jsx,
        uses: [...allUses].sort(),
      };
    },

    enum(name, members, doc) {
      const rk = registry.get(name) ?? refkey();
      const uses = ["serde::Serialize", "serde::Deserialize"];

      const jsx = (
        <>
          {members.map(m => (
            <>{m.name},{"\n"}</>
          ))}
        </>
      );

      return {
        name,
        refkey: rk,
        jsx,
        uses: [...new Set(uses)].sort(),
      };
    },
  };
}

// Pre-allocate refkeys for all types so cross-references resolve.
export function buildRegistry(types: { name: string }[]): RefkeyRegistry {
  const registry: RefkeyRegistry = new Map();
  for (const t of types) {
    registry.set(t.name, refkey());
  }
  return registry;
}
