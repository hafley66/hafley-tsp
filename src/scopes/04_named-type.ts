import { OutputScopeOptions } from "@alloy-js/core";
import { RustNamedTypeSymbol } from "../symbols/01_named-type.js";
import { RustScope } from "./00_rust.js";

export class RustNamedTypeScope extends RustScope {
  public static readonly declarationSpaces = [];

  constructor(
    ownerSymbol: RustNamedTypeSymbol,
    parentScope: RustScope | undefined,
    options: OutputScopeOptions = {},
  ) {
    super(`${ownerSymbol.name} scope`, parentScope, {
      ownerSymbol,
      ...options,
    });
  }

  get ownerSymbol(): RustNamedTypeSymbol {
    return super.ownerSymbol as RustNamedTypeSymbol;
  }

  get members() {
    return this.ownerSymbol.members;
  }
}
