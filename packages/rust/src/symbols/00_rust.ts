import {
  Namekey,
  OutputDeclarationSpace,
  OutputMemberSpace,
  OutputSpace,
  OutputSymbol,
  OutputSymbolOptions,
  createSymbol,
} from "@alloy-js/core";
import type { RustScope } from "../scopes/00_rust.js";

export interface RustSymbolOptions extends OutputSymbolOptions {}

export class RustSymbol extends OutputSymbol {
  constructor(
    name: string | Namekey,
    spaces: OutputSpace[] | OutputSpace | undefined,
    options: RustSymbolOptions = {},
  ) {
    super(name, spaces, options);
  }

  get enclosingModule(): RustSymbol | undefined {
    if (this.spaces.length === 0) return undefined;
    const firstSpace = this.spaces[0];
    if (firstSpace instanceof OutputMemberSpace) {
      return (firstSpace.symbol as RustSymbol).enclosingModule;
    } else if (firstSpace instanceof OutputDeclarationSpace) {
      return (firstSpace.scope as RustScope).enclosingModule;
    }
    return undefined;
  }

  protected getRustCopyOptions(): RustSymbolOptions {
    return { ...this.getCopyOptions() };
  }

  protected initializeRustCopy(copy: RustSymbol) {
    this.initializeCopy(copy);
  }

  copy(): OutputSymbol {
    const copy = createSymbol(RustSymbol, this.name, undefined, {
      ...this.getRustCopyOptions(),
      binder: this.binder,
    });
    this.initializeRustCopy(copy);
    return copy;
  }
}
