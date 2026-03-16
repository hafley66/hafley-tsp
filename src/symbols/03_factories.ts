import { createSymbol, Namekey, NamePolicyGetter } from "@alloy-js/core";
import { RustElements, useRustNamePolicy } from "../00_name-policy.js";
import { useRustScope } from "../scopes/06_contexts.js";
import { useNamedTypeScope } from "../scopes/06_contexts.js";
import { RustLexicalScope } from "../scopes/01_lexical.js";
import { RustNamedTypeScope } from "../scopes/04_named-type.js";
import { RustFunctionScope } from "../scopes/05_function.js";
import { RustSymbol, RustSymbolOptions } from "./00_rust.js";
import { RustNamedTypeSymbol, RustNamedTypeSymbolOptions, RustTypeKind } from "./01_named-type.js";
import { RustFunctionSymbol } from "./02_function.js";

export function createTypeSymbol(
  originalName: string | Namekey,
  kind: RustTypeKind,
  options: RustNamedTypeSymbolOptions = {},
): RustNamedTypeSymbol {
  const scope = useRustScope();
  if (!(scope instanceof RustLexicalScope)) {
    throw new Error("Can't create type symbol outside a lexical scope");
  }
  return createSymbol(RustNamedTypeSymbol, originalName, scope.declarations, kind, {
    ...withNamePolicy(options, "struct"),
    binder: options.binder ?? scope.binder,
  });
}

export function createFieldSymbol(
  originalName: string | Namekey,
  options: RustNamedTypeSymbolOptions = {},
): RustNamedTypeSymbol {
  const scope = useNamedTypeScope();
  return createSymbol(
    RustNamedTypeSymbol,
    originalName,
    scope.members,
    "field",
    {
      ...withNamePolicy(options, "field"),
      binder: options.binder ?? scope.ownerSymbol.binder,
    },
  );
}

export function createFunctionSymbol(
  originalName: string | Namekey,
  options: RustSymbolOptions = {},
): RustFunctionSymbol {
  const scope = useRustScope();
  if (scope instanceof RustLexicalScope) {
    return createSymbol(RustFunctionSymbol, originalName, scope.declarations, {
      ...withNamePolicy(options, "function"),
      binder: options.binder ?? scope.binder,
    });
  }
  // Inside an impl block or similar -- no declaration space
  return createSymbol(RustFunctionSymbol, originalName, undefined, {
    ...withNamePolicy(options, "function"),
    binder: options.binder ?? scope.binder,
  });
}

export function createParameterSymbol(
  originalName: string | Namekey,
  options: RustSymbolOptions = {},
): RustSymbol {
  const scope = useRustScope();
  if (!(scope instanceof RustFunctionScope)) {
    throw new Error("Can't create parameter symbol outside a function scope");
  }
  return createSymbol(RustSymbol, originalName, scope.parameters, {
    ...withNamePolicy(options, "parameter"),
    binder: options.binder ?? scope.binder,
  });
}

function withNamePolicy<T extends { namePolicy?: NamePolicyGetter }>(
  options: T,
  elementType: RustElements,
): RustSymbolOptions {
  return {
    ...options,
    namePolicy: options.namePolicy ?? useRustNamePolicy().for(elementType),
  };
}
