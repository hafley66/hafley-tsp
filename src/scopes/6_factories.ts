import { OutputScopeOptions, createScope } from "@alloy-js/core";
import { RustNamedTypeSymbol } from "../symbols/1_named-type.js";
import { useRustScope } from "./5_contexts.js";
import { RustNamedTypeScope } from "./3_named-type.js";
import { RustFunctionScope } from "./4_function.js";
import { RustLexicalScope } from "./1_lexical.js";
import { RustSourceFileScope } from "./2_source-file.js";

export function createNamedTypeScope(
  ownerSymbol: RustNamedTypeSymbol,
  options: OutputScopeOptions = {},
): RustNamedTypeScope {
  const currentScope = useRustScope();
  return createScope(RustNamedTypeScope, ownerSymbol, currentScope, options);
}

export function createFunctionScope(
  options: OutputScopeOptions = {},
): RustFunctionScope {
  const parentScope = useRustScope();
  return createScope(RustFunctionScope, "function scope", parentScope, options);
}
