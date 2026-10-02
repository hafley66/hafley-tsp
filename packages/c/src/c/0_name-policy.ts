import { createNamePolicy, NamePolicy, useNamePolicy } from "@alloy-js/core";

// element = the tree-sitter node kind that declares the name
export type CElements = "type_definition" | "struct_specifier" | "enum_specifier" | "enumerator" | "field_declaration";

// C11 6.4.1 keywords
const C_KEYWORDS = new Set([
  "auto", "break", "case", "char", "const", "continue", "default", "do", "double",
  "else", "enum", "extern", "float", "for", "goto", "if", "inline", "int", "long",
  "register", "restrict", "return", "short", "signed", "sizeof", "static", "struct",
  "switch", "typedef", "union", "unsigned", "void", "volatile", "while", "_Alignas",
  "_Alignof", "_Atomic", "_Bool", "_Complex", "_Generic", "_Imaginary", "_Noreturn",
  "_Static_assert", "_Thread_local",
  // Standard library macros that rewrite any token of the same spelling.
  "stdin", "stdout", "stderr", "errno", "assert", "bool", "true", "false", "NULL", "EOF",
  "offsetof", "static_assert", "alignas", "alignof", "noreturn", "complex", "imaginary",
]);

// Hyphens map to underscores, a leading digit gains a leading underscore, and
// C11 keywords and std macro names gain a trailing underscore
// (default -> default_). Boundary values retain their TypeSpec spelling.
export function cIdentifier(name: string): string {
  const mapped = name.replaceAll("-", "_");
  const identifier = /^[0-9]/.test(mapped) ? `_${mapped}` : mapped;
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) throw new Error(`Invalid C11 identifier: ${name}`);
  return C_KEYWORDS.has(identifier) ? `${identifier}_` : identifier;
}

export function assertDistinctIdentifiers(names: string[], scope: string): void {
  const seen = new Set<string>();
  for (const name of names) {
    const identifier = cIdentifier(name);
    if (seen.has(identifier)) throw new Error(`C identifier collision in ${scope}: ${identifier}`);
    seen.add(identifier);
  }
}
export function createCNamePolicy(): NamePolicy<CElements> {
  return createNamePolicy((name) => cIdentifier(name));
}

export function useCNamePolicy(): NamePolicy<CElements> {
  return useNamePolicy();
}
