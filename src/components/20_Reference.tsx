import { computed, emitSymbol, OutputSymbol, Refkey, resolve } from "@alloy-js/core";
import { RustScope } from "../scopes/00_rust.js";
import { RustSourceFileScope, useSourceFileScope } from "../scopes/03_source-file.js";
import { RustSymbol } from "../symbols/00_rust.js";
import { RustNamedTypeSymbol } from "../symbols/01_named-type.js";

export interface ReferenceProps {
  refkey: Refkey;
}

export function Reference({ refkey }: ReferenceProps) {
  const sfScope = useSourceFileScope();
  const resolveResult = resolve<RustScope, RustSymbol>(refkey);

  const resolved = computed((): [string, OutputSymbol | undefined] => {
    if (resolveResult.value === undefined) {
      return ["<Unresolved Symbol>", undefined];
    }

    const { pathDown, memberPath, lexicalDeclaration } = resolveResult.value;

    // Check if the target is in a different source file
    const targetFileScope = pathDown.find(s => s instanceof RustSourceFileScope) as RustSourceFileScope | undefined;

    if (!targetFileScope) {
      // Same file or same scope -- bare name
      const parts = [lexicalDeclaration.name, ...memberPath.map(m => m.name)];
      return [parts.join("::"), resolveResult.value.symbol];
    }

    // Cross-file: register use statement and emit bare name at usage site
    if (sfScope && lexicalDeclaration instanceof RustNamedTypeSymbol) {
      sfScope.addUse(lexicalDeclaration);
    }

    const usageName = [lexicalDeclaration.name, ...memberPath.map(m => m.name)].join("::");
    return [usageName, resolveResult.value.symbol];
  });

  if (resolved.value[1]) {
    emitSymbol(resolved.value[1]);
  }

  return <>{resolved.value[0]}</>;
}
