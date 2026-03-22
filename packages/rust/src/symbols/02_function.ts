import { Namekey, OutputSpace } from "@alloy-js/core";
import { RustSymbol, RustSymbolOptions } from "./00_rust.js";

export class RustFunctionSymbol extends RustSymbol {
  constructor(
    name: string | Namekey,
    spaces: OutputSpace | undefined,
    options: RustSymbolOptions = {},
  ) {
    super(name, spaces, options);
  }
}
