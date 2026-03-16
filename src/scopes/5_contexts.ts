import { useScope } from "@alloy-js/core";
import { RustScope } from "./0_rust.js";
import { RustLexicalScope } from "./1_lexical.js";
import { RustModuleScope } from "./1a_module.js";
import { RustNamedTypeScope } from "./3_named-type.js";
import { RustFunctionScope } from "./4_function.js";

export function useRustScope(): RustScope {
  const scope = useScope();
  if (!(scope instanceof RustScope)) {
    throw new Error("Expected a Rust scope, got " + scope.constructor.name);
  }
  return scope;
}

export function useNamedTypeScope(): RustNamedTypeScope {
  const scope = useRustScope();
  if (!(scope instanceof RustNamedTypeScope)) {
    throw new Error("Expected a named type scope, got " + scope.constructor.name);
  }
  return scope;
}

export function useFunctionScope(): RustFunctionScope {
  const scope = useRustScope();
  if (!(scope instanceof RustFunctionScope)) {
    throw new Error("Expected a function scope, got " + scope.constructor.name);
  }
  return scope;
}

export function useLexicalScope(): RustLexicalScope {
  const scope = useRustScope();
  if (!(scope instanceof RustLexicalScope)) {
    throw new Error("Expected a lexical scope, got " + scope.constructor.name);
  }
  return scope;
}

export function useModuleScope(): RustModuleScope | undefined {
  let scope = useRustScope() as RustScope | undefined;
  while (scope) {
    if (scope instanceof RustModuleScope) return scope;
    scope = scope.parent as RustScope | undefined;
  }
  return undefined;
}
