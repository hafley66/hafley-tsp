import {
  Children,
  createScope,
  Scope,
  SourceDirectory,
} from "@alloy-js/core";
import { RustModuleScope } from "../scopes/02_module.js";
import { useRustScope } from "../scopes/06_contexts.js";
import { SourceFile } from "./23_SourceFile.js";

export interface ModDirectoryProps {
  name: string;
  children?: Children;
}

export function ModDirectory(props: ModDirectoryProps) {
  const parentScope = useRustScope();
  const moduleScope = createScope(RustModuleScope, props.name, parentScope);

  // Register this directory as a child module with the parent module scope
  if (parentScope instanceof RustModuleScope) {
    parentScope.addMod(props.name);
  }

  return (
    <SourceDirectory path={props.name}>
      <Scope value={moduleScope}>
        <SourceFile path="mod.rs" />
        {props.children}
      </Scope>
    </SourceDirectory>
  );
}
