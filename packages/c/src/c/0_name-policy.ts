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
]);

// Only hyphens are mapped. Boundary values retain their TypeSpec spelling.
export function cIdentifier(name: string): string {
  const identifier = name.replaceAll("-", "_");
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier) || C_KEYWORDS.has(identifier)) {
    throw new Error(`Invalid C11 identifier: ${name}`);
  }
  return identifier;
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
