import { OutputScopeOptions, shallowReactive } from "@alloy-js/core";
import { RustLexicalScope } from "./1_lexical.js";
import { RustScope } from "./0_rust.js";

// Module scope: a directory-level scope that tracks child module declarations.
// Both CrateDirectory (crate root) and ModDirectory create one of these.
// Child SourceFiles register their module names here, and mod-root files
// (lib.rs, mod.rs) render the collected `pub mod` declarations.
export class RustModuleScope extends RustLexicalScope {
  mods = shallowReactive<Set<string>>(new Set());

  constructor(
    name: string,
    parent?: RustScope,
    options?: OutputScopeOptions,
  ) {
    super(name, parent, options);
  }

  addMod(name: string) {
    this.mods.add(name);
  }
}
