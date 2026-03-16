import { computed, For, memo, resolve, Refkey } from "@alloy-js/core";
import { UseRecords } from "../scopes/2_source-file.js";
import { RustSourceFileScope } from "../scopes/2_source-file.js";
import { RustScope } from "../scopes/0_rust.js";
import { RustSymbol } from "../symbols/0_rust.js";
import { RustNamedTypeSymbol } from "../symbols/1_named-type.js";

export interface UseStatementsProps {
  records: UseRecords;
}

export function UseStatements(props: UseStatementsProps) {
  const statements = computed(() => {
    const entries: string[] = [];
    for (const [sym] of props.records) {
      // Walk up from the symbol to build the crate:: path.
      // The symbol's spaces track which scope it belongs to.
      // We reconstruct the path from the scope chain.
      const path = buildUsePath(sym);
      entries.push(path);
    }
    entries.sort();
    return entries;
  });

  return memo(() => {
    if (statements.value.length === 0) return null;
    return (
      <For each={statements.value} joiner={<><hbr /></>}>
        {(path) => <>use {path};</>}
      </For>
    );
  });
}

function buildUsePath(sym: RustNamedTypeSymbol): string {
  // Walk the scope chain from the symbol upward to build crate::mod::Type
  const parts: string[] = [];
  parts.push(sym.name);

  // Find the source file scope that contains this symbol
  // by walking up through its spaces
  const spaces = sym.spaces;
  if (spaces.length > 0) {
    const space = spaces[0];
    // The space belongs to a scope -- walk up scopes to find source file
    let scope = (space as any).scope as RustScope | undefined;
    while (scope) {
      if (scope instanceof RustSourceFileScope) {
        const cleaned = scope.name
          .replace(/^\.\//, "")
          .replace(/\.rs$/, "")
          .replace(/\/mod$/, "");
        for (const seg of cleaned.split("/").reverse()) {
          if (seg && seg !== "lib" && seg !== "main") {
            parts.unshift(seg);
          }
        }
        break;
      }
      scope = scope.parent as RustScope | undefined;
    }
  }

  parts.unshift("crate");
  return parts.join("::");
}
