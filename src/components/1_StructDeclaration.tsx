import { Block, Children, Declaration, For, Name, Namekey, Refkey, Scope } from "@alloy-js/core";
import { createNamedTypeScope } from "../scopes/6_factories.js";
import { createTypeSymbol, createFieldSymbol } from "../symbols/3_factories.js";
import { Generics, GenericsProps, WhereClause, WhereClauseProps } from "./0_Generics.js";
import { Attributes } from "./0a_Attributes.js";

export interface StructFieldProps {
  name: string | Namekey;
  type: Children;
  pub?: boolean;
  attrs?: string[];
  refkey?: Refkey;
}

export function StructField(props: StructFieldProps) {
  const sym = createFieldSymbol(props.name, { refkeys: props.refkey });
  const fieldAttrs = props.attrs && props.attrs.length > 0
    ? <><Attributes attrs={props.attrs} />{"\n"}</>
    : null;
  return (
    <Declaration symbol={sym}>
      {fieldAttrs}{props.pub ? "pub " : ""}<Name />: {props.type},
    </Declaration>
  );
}

export interface StructDeclarationProps extends GenericsProps {
  name: string | Namekey;
  pub?: boolean;
  attrs?: string[];
  derive?: string[];
  where?: WhereClause[];
  children?: Children;
  refkey?: Refkey;
  // Explicit flag to distinguish "no body" (unit struct) from "empty body" (empty braced struct)
  braced?: boolean;
}

export function StructDeclaration(props: StructDeclarationProps) {
  const sym = createTypeSymbol(props.name, "struct", { refkeys: props.refkey });
  const scope = createNamedTypeScope(sym);

  const allAttrs = [
    ...(props.derive && props.derive.length > 0 ? [`derive(${props.derive.join(", ")})`] : []),
    ...(props.attrs ?? []),
  ];
  const attrsBlock = allAttrs.length > 0
    ? <><Attributes attrs={allAttrs} />{"\n"}</>
    : null;

  const vis = props.pub ? "pub " : "";

  const whereClause = props.where && props.where.length > 0
    ? <WhereClause clauses={props.where} />
    : null;

  const hasBody = props.children !== undefined && props.children !== null;

  if (!hasBody && !props.braced) {
    if (whereClause) {
      return (
        <Declaration symbol={sym}>
          {attrsBlock}{vis}struct <Name /><Generics {...props} />{whereClause}{"{}"}
        </Declaration>
      );
    }
    return (
      <Declaration symbol={sym}>
        {attrsBlock}{vis}struct <Name /><Generics {...props} />;
      </Declaration>
    );
  }

  if (!hasBody && props.braced) {
    return (
      <Declaration symbol={sym}>
        {attrsBlock}{vis}struct <Name /><Generics {...props} />{whereClause} {"{}"}
      </Declaration>
    );
  }

  return (
    <Declaration symbol={sym}>
      {attrsBlock}{vis}struct <Name /><Generics {...props} />{whereClause} <Scope value={scope}><Block>{props.children}</Block></Scope>
    </Declaration>
  );
}

export interface TupleStructDeclarationProps extends GenericsProps {
  name: string | Namekey;
  pub?: boolean;
  attrs?: string[];
  derive?: string[];
  fields: Children[];
  refkey?: Refkey;
}

export function TupleStructDeclaration(props: TupleStructDeclarationProps) {
  const sym = createTypeSymbol(props.name, "struct", { refkeys: props.refkey });

  const allAttrs = [
    ...(props.derive && props.derive.length > 0 ? [`derive(${props.derive.join(", ")})`] : []),
    ...(props.attrs ?? []),
  ];
  const attrsBlock = allAttrs.length > 0
    ? <><Attributes attrs={allAttrs} />{"\n"}</>
    : null;

  const vis = props.pub ? "pub " : "";

  return (
    <Declaration symbol={sym}>
      {attrsBlock}{vis}struct <Name /><Generics {...props} />(<For each={props.fields} joiner=", ">{(f) => f}</For>);
    </Declaration>
  );
}
