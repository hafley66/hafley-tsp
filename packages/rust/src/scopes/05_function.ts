import type { OutputSpace } from "@alloy-js/core";
import { RustLexicalScope } from "./01_lexical.js";

export class RustFunctionScope extends RustLexicalScope {
  public static readonly declarationSpaces = [
    "local-variables",
    "parameters",
  ];

  get localVariables(): OutputSpace {
    return this.spaceFor("local-variables")!;
  }

  get parameters(): OutputSpace {
    return this.spaceFor("parameters")!;
  }
}
