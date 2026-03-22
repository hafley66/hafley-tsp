import { createContext, useContext, useScope } from "@alloy-js/core";
import { RustScope } from "./00_rust.js";
import { RustLexicalScope } from "./01_lexical.js";
import { RustModuleScope } from "./02_module.js";
import { RustNamedTypeScope } from "./04_named-type.js";
import { RustFunctionScope } from "./05_function.js";

// Visibility context: when provided, declarations default to this visibility.
// undefined = no default visibility (private). "pub" = all declarations are pub unless explicitly opted out.
export const VisibilityContext = createContext<string | undefined>(undefined, "VisibilityContext");

/**
 * Resolve visibility for a declaration.
 * - pub={true} -> "pub "
 * - pub={false} -> "" (explicit opt-out, even inside a pub context)
 * - pub={undefined} -> defer to VisibilityContext
 */
export function useVisibility(pubProp: boolean | undefined): string {
  const contextVis = useContext(VisibilityContext);
  if (pubProp === true) return "pub ";
  if (pubProp === false) return "";
  return contextVis ? contextVis + " " : "";
}

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
