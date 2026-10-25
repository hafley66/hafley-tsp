import {
  Children,
  createScope,
  Scope,
  SourceDirectory,
} from "@alloy-js/core";
import { RustModuleScope } from "../../scopes/02_module.js";

export interface CrateDirectoryProps {
  children?: Children;
  path?: string;
  // Rust path of the generated root module: "crate" (default) or e.g. "crate::_9_wire"
  // when the output is mounted under a module of a larger crate.
  modulePath?: string;
}

export function CrateDirectory(props: CrateDirectoryProps) {
  const crateScope = createScope(RustModuleScope, props.modulePath ?? "crate", undefined);

  return (
    <SourceDirectory path={props.path ?? "."}>
      <Scope value={crateScope}>{props.children}</Scope>
    </SourceDirectory>
  );
}
