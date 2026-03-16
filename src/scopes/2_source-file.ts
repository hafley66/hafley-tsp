import {
  OutputScopeOptions,
  OutputScope,
  createSymbol,
  shallowReactive,
  useScope,
} from "@alloy-js/core";
import { RustSymbol } from "../symbols/0_rust.js";
import { RustNamedTypeSymbol } from "../symbols/1_named-type.js";
import { RustScope } from "./0_rust.js";
import { RustLexicalScope } from "./1_lexical.js";

export type UseRecords = Map<RustNamedTypeSymbol, RustSymbol>;

export class RustSourceFileScope extends RustLexicalScope {
  uses = shallowReactive<UseRecords>(new Map());

  constructor(
    name: string,
    parent?: RustScope,
    options?: OutputScopeOptions,
  ) {
    super(name, parent, options);
  }

  addUse(symbol: RustNamedTypeSymbol): RustSymbol {
    if (this.uses.has(symbol)) {
      return this.uses.get(symbol)!;
    }

    const localSymbol = createSymbol(RustSymbol, symbol.name, this.declarations, {
      aliasTarget: symbol,
      binder: this.binder,
    });

    this.uses.set(symbol, localSymbol);
    return localSymbol;
  }
}

export function useSourceFileScope(): RustSourceFileScope | undefined {
  let scope: OutputScope | undefined = useScope();
  while (scope) {
    if (scope instanceof RustSourceFileScope) return scope;
    scope = scope.parent;
  }
  return undefined;
}
