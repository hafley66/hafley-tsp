import {
  SourceFile as CoreSourceFile,
  createScope,
  For,
  Scope,
  Show,
  SourceDirectoryContext,
  useContext,
  type Children,
} from "@alloy-js/core";
import { join } from "pathe";
import { RustModuleScope } from "../../scopes/02_module.js";
import { RustSourceFileScope } from "../../scopes/03_source-file.js";
import { useRustScope } from "../../scopes/06_contexts.js";
import { Reference } from "../2_references/0_Reference.js";
import { UseStatements } from "../2_references/1_UseStatement.js";
import { ModStatements } from "../2_references/2_ModStatements.js";

export interface SourceFileProps {
  path: string;
  externalUses?: string[];
  children?: Children;
}

function isModRoot(path: string): boolean {
  return path === "lib.rs" || path === "mod.rs" || path === "main.rs";
}

export function SourceFile(props: SourceFileProps) {
  const parentScope = useRustScope();
  const directoryContext = useContext(SourceDirectoryContext)!;
  const currentDir = directoryContext.path;
  const path = join(currentDir, props.path);
  const scope = createScope(RustSourceFileScope, path, parentScope);

  // Register this file as a child module with the parent module scope.
  // mod-root files (lib.rs, mod.rs, main.rs) don't register -- they ARE the module.
  const moduleScope = parentScope instanceof RustModuleScope ? parentScope : undefined;
  if (!isModRoot(props.path) && moduleScope) {
    moduleScope.addMod(props.path.replace(/\.rs$/, ""));
  }

  // Only mod-root files render `pub mod` declarations
  const renderMods = isModRoot(props.path) && moduleScope;

  return (
    <CoreSourceFile path={props.path} filetype="rs" reference={Reference}>
      <Scope value={scope}>
        {renderMods && (
          <Show when={moduleScope!.mods.size > 0}>
            <ModStatements mods={moduleScope!.mods} />
            <hbr />
            <hbr />
          </Show>
        )}
        {props.externalUses && props.externalUses.length > 0 && (
          <>
            <For each={[...props.externalUses].sort()} joiner={<><hbr /></>}>
              {(path: string) => <>use {path};</>}
            </For>
            <hbr />
            <hbr />
          </>
        )}
        <Show when={scope.uses.size > 0}>
          <UseStatements records={scope.uses} />
          <hbr />
          <hbr />
        </Show>
        {props.children}
      </Scope>
    </CoreSourceFile>
  );
}
