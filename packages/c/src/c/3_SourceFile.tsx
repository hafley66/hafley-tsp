import { computed, createScope, emitSymbol, NamePolicyContext, reactive, resolve, Scope, SourceFile as CoreSourceFile, useScope, type Children, type Refkey } from "@alloy-js/core";
import { posix } from "node:path";
import { createCNamePolicy } from "./0_name-policy.js";
import { CScope, CSymbol } from "./1_scope.js";

export class CFileScope extends CScope {
  includes = reactive(new Set<string>());
  constructor(public path: string, parent: CScope) { super(path, parent); }
}

// Refkeys determine both the spelling and the owning header. Includes react to
// declarations rendered later, including mutually recursive model pointers.
export function Reference(props: { refkey: Refkey }) {
  const current = useScope() as CScope;
  const result = resolve<CScope, CSymbol>(props.refkey);
  return computed(() => {
    const resolved = result.value;
    if (!resolved) return "<Unresolved C type reference>";
    let source: CScope | undefined = current;
    while (source && !(source instanceof CFileScope)) source = source.parent as CScope | undefined;
    let target = resolved.symbol.scope as CScope | undefined;
    while (target && !(target instanceof CFileScope)) target = target.parent as CScope | undefined;
    if (source instanceof CFileScope && target instanceof CFileScope && source.path !== target.path) {
      source.includes.add(posix.relative(posix.dirname(source.path), target.path));
    }
    emitSymbol(resolved.symbol);
    return resolved.symbol.name;
  });
}

export function SourceFile(props: { path: string; children?: Children }) {
  const scope = createScope(CFileScope, props.path, useScope() as CScope);
  return <NamePolicyContext.Provider value={createCNamePolicy()}>
    <CoreSourceFile path={props.path} filetype="c" reference={Reference}>
      <Scope value={scope}>
        {computed(() => [...scope.includes].sort().map(path => `#include "${path}"\n`).join(""))}
        {props.children}
      </Scope>
    </CoreSourceFile>
  </NamePolicyContext.Provider>;
}
