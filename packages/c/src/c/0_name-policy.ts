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

// Invalid C names are reported rather than rewritten.
export function createCNamePolicy(): NamePolicy<CElements> {
  return createNamePolicy((name) => {
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name) || C_KEYWORDS.has(name)) {
      throw new Error(`Invalid C11 identifier: ${name}`);
    }
    return name;
  });
}

export function useCNamePolicy(): NamePolicy<CElements> {
  return useNamePolicy();
}
