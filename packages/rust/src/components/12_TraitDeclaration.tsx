import { Block, Children, Declaration, For, Name, Namekey, Refkey, Scope } from "@alloy-js/core";
import { createNamedTypeScope } from "../scopes/07_factories.js";
import { useVisibility } from "../scopes/06_contexts.js";
import { createTypeSymbol } from "../symbols/03_factories.js";
import { Generics, GenericsProps, WhereClause, WhereClauseProps } from "./00_Generics.js";
import { Attributes } from "./01_Attributes.js";

export interface TraitDeclarationProps extends GenericsProps {
  name: string | Namekey;
  pub?: boolean;
  attrs?: string[];
  // Supertraits: e.g. ["Clone", "Debug"] renders `: Clone + Debug`
  supertraits?: Children[];
  where?: WhereClause[];
  children?: Children;
  refkey?: Refkey;
}

export function TraitDeclaration(props: TraitDeclarationProps) {
  const sym = createTypeSymbol(props.name, "trait", { refkeys: props.refkey });
  const scope = createNamedTypeScope(sym);

  const vis = useVisibility(props.pub);

  const attrsBlock = props.attrs && props.attrs.length > 0
    ? <><Attributes attrs={props.attrs} />{"\n"}</>
    : null;

  const supertraitsPart = props.supertraits && props.supertraits.length > 0
    ? <>: <For each={props.supertraits} joiner=" + ">{(s) => s}</For></>
    : null;

  const whereClause = props.where && props.where.length > 0
    ? <WhereClause clauses={props.where} />
    : null;

  const hasBody = props.children !== undefined && props.children !== null;

  if (!hasBody) {
    return (
      <Declaration symbol={sym}>
        {attrsBlock}{vis}trait <Name /><Generics {...props} />{supertraitsPart}{whereClause} {"{}"}
      </Declaration>
    );
  }

  return (
    <Declaration symbol={sym}>
      {attrsBlock}{vis}trait <Name /><Generics {...props} />{supertraitsPart}{whereClause} <Scope value={scope}><Block>{props.children}</Block></Scope>
    </Declaration>
  );
}

// A method signature inside a trait (no body). Renders `fn name(&self, ...) -> T;`
export interface TraitMethodProps {
  name: string;
  selfParam?: "&" | "&mut" | "owned";
  params?: { name: string; type: Children }[];
  returns?: Children;
}

export function TraitMethod(props: TraitMethodProps) {
  const selfStr = props.selfParam === "&" ? "&self"
    : props.selfParam === "&mut" ? "&mut self"
    : props.selfParam === "owned" ? "self"
    : null;

  const params = props.params ?? [];
  const allParams = selfStr ? [{ name: selfStr } as { name: string; type?: Children }, ...params] : params;

  const paramList = allParams.length > 0
    ? <For each={allParams} joiner=", ">{(p) =>
        p.type ? <>{p.name}: {p.type}</> : <>{p.name}</>
      }</For>
    : null;

  const returnType = props.returns
    ? <> -&gt; {props.returns}</>
    : null;

  return <>fn {props.name}({paramList}){returnType};</>;
}

// An associated type inside a trait. Renders `type Item;` or `type Item: Bound;`
export interface AssociatedTypeProps {
  name: string;
  bounds?: Children[];
}

export function AssociatedType(props: AssociatedTypeProps) {
  const boundsPart = props.bounds && props.bounds.length > 0
    ? <>: <For each={props.bounds} joiner=" + ">{(b) => b}</For></>
    : null;
  return <>type {props.name}{boundsPart};</>;
}
