// Rust TargetLang: TypeDef[] → Rust source strings.

import type { TargetLang, MappedField, MappedMember } from "./1_target.js";

const SCALAR_MAP: Record<string, string> = {
  string: "String",
  boolean: "bool",
  int8: "i8", int16: "i16", int32: "i32", int64: "i64",
  uint8: "u8", uint16: "u16", uint32: "u32", uint64: "u64",
  float32: "f32", float64: "f64",
  float: "f64", integer: "i64", numeric: "f64", safeint: "i64",
  bytes: "Vec<u8>",
  utcDateTime: "DateTime<Utc>",
  plainDate: "NaiveDate",
  plainTime: "NaiveTime",
  duration: "Duration",
  url: "String",
  uuid: "Uuid",
  decimal: "Decimal",
  decimal128: "Decimal",
  offsetDateTime: "DateTime<FixedOffset>",
};

// Scalars that need use statements
const SCALAR_USES: Record<string, string[]> = {
  utcDateTime: ["chrono::DateTime", "chrono::Utc"],
  plainDate: ["chrono::NaiveDate"],
  plainTime: ["chrono::NaiveTime"],
  duration: ["std::time::Duration"],
  uuid: ["uuid::Uuid"],
  decimal: ["rust_decimal::Decimal"],
  decimal128: ["rust_decimal::Decimal"],
  offsetDateTime: ["chrono::DateTime", "chrono::FixedOffset"],
};

function toSnakeCase(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();
}

function toPascalCase(name: string): string {
  return name
    .split(/[_\s-]+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

export interface RustDecl {
  code: string;
  uses: string[];
}

export const rustTarget: TargetLang<string, RustDecl> = {
  typeName: toPascalCase,
  fieldName: toSnakeCase,
  memberName: toPascalCase,

  scalar(name) {
    return SCALAR_MAP[name] ?? name;
  },

  optional(inner) {
    return `Option<${inner}>`;
  },

  array(inner) {
    return `Vec<${inner}>`;
  },

  map(key, value) {
    return `HashMap<${key}, ${value}>`;
  },

  ref(name) {
    return toPascalCase(name);
  },

  model(name, fields, doc) {
    const uses = new Set<string>(["serde::Serialize", "serde::Deserialize"]);

    // Collect uses from field types by scanning for known patterns
    for (const f of fields) {
      collectUsesFromType(f.type, uses);
    }

    const usesArr = [...uses].sort();
    const useLines = usesArr.map(u => `use ${u};`).join("\n");
    const derives = "#[derive(Debug, Clone, Serialize, Deserialize)]";

    const fieldLines = fields.map(f => {
      const docLine = f.doc ? `  /// ${f.doc}\n` : "";
      return `${docLine}  pub ${f.name}: ${f.type},`;
    }).join("\n");

    const docBlock = doc ? `/// ${doc}\n` : "";
    const code = [
      useLines,
      "",
      `${docBlock}${derives}`,
      `pub struct ${name} {`,
      fieldLines,
      "}",
    ].join("\n");

    return { code, uses: usesArr };
  },

  enum(name, members, doc) {
    const uses = ["serde::Serialize", "serde::Deserialize"];
    const usesArr = [...new Set(uses)].sort();
    const useLines = usesArr.map(u => `use ${u};`).join("\n");
    const derives = "#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]";

    const memberLines = members.map(m => {
      const docLine = m.doc ? `  /// ${m.doc}\n` : "";
      return `${docLine}  ${toPascalCase(m.name)},`;
    }).join("\n");

    const docBlock = doc ? `/// ${doc}\n` : "";
    const code = [
      useLines,
      "",
      `${docBlock}${derives}`,
      `pub enum ${name} {`,
      memberLines,
      "}",
    ].join("\n");

    return { code, uses: usesArr };
  },
};

function collectUsesFromType(typeStr: string, uses: Set<string>) {
  // Walk through known scalar types and collect their uses
  for (const [scalar, scalarUses] of Object.entries(SCALAR_USES)) {
    const rustType = SCALAR_MAP[scalar];
    if (rustType && typeStr.includes(rustType)) {
      for (const u of scalarUses) uses.add(u);
    }
  }
  if (typeStr.includes("HashMap")) uses.add("std::collections::HashMap");
}
