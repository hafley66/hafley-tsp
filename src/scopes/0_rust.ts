import { OutputScope, OutputScopeOptions } from "@alloy-js/core";
import type { RustSymbol } from "../symbols/0_rust.js";

export class RustScope extends OutputScope {
  #moduleSymbol: RustSymbol | undefined;

  constructor(
    name: string,
    parent: RustScope | undefined,
    options?: OutputScopeOptions,
  ) {
    super(name, parent, options);
    this.#moduleSymbol = parent?.enclosingModule;
  }

  get enclosingModule(): RustSymbol | undefined {
    return this.#moduleSymbol;
  }
}
