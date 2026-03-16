import { createNamePolicy, NamePolicy, useNamePolicy } from "@alloy-js/core";

export type RustElements =
  | "struct"
  | "enum"
  | "enum-variant"
  | "field"
  | "function"
  | "method"
  | "parameter"
  | "variable"
  | "constant"
  | "static"
  | "type-parameter"
  | "module"
  | "trait"
  | "trait-method"
  | "lifetime";

// https://doc.rust-lang.org/reference/keywords.html
const RUST_KEYWORDS = new Set([
  // strict
  "as", "async", "await", "break", "const", "continue", "crate", "dyn",
  "else", "enum", "extern", "false", "fn", "for", "if", "impl", "in",
  "let", "loop", "match", "mod", "move", "mut", "pub", "ref", "return",
  "self", "Self", "static", "struct", "super", "trait", "true", "type",
  "unsafe", "use", "where", "while",
  // reserved
  "abstract", "become", "box", "do", "final", "macro", "override",
  "priv", "try", "typeof", "unsized", "virtual", "yield",
]);

export function createRustNamePolicy(): NamePolicy<RustElements> {
  return createNamePolicy((name, element) => {
    // lifetimes can't be raw identifiers
    if (element === "lifetime") return name;
    if (RUST_KEYWORDS.has(name)) return `r#${name}`;
    return name;
  });
}

export function useRustNamePolicy(): NamePolicy<RustElements> {
  return useNamePolicy();
}
