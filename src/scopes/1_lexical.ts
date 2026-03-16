import type { OutputSpace } from "@alloy-js/core";
import { RustScope } from "./0_rust.js";

// Lexical scope: a scope that holds declarations (types, values).
// In Rust, types and values share one namespace per scope.
export class RustLexicalScope extends RustScope {
  public static readonly declarationSpaces = ["declarations"];

  get declarations(): OutputSpace {
    return this.spaceFor("declarations")!;
  }
}
