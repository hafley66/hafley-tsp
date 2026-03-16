import {
  Children,
  createScope,
  Scope,
  SourceDirectory,
} from "@alloy-js/core";
import { RustModuleScope } from "../scopes/1a_module.js";

export interface CrateDirectoryProps {
  children?: Children;
  path?: string;
}

export function CrateDirectory(props: CrateDirectoryProps) {
  const crateScope = createScope(RustModuleScope, "crate", undefined);

  return (
    <SourceDirectory path={props.path ?? "."}>
      <Scope value={crateScope}>{props.children}</Scope>
    </SourceDirectory>
  );
}
