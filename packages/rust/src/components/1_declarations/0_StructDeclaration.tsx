import { Block, Children, Declaration, For, Name, Namekey, Refkey, Scope } from "@alloy-js/core";
import { createNamedTypeScope } from "../../scopes/07_factories.js";
import { useVisibility } from "../../scopes/06_contexts.js";
import { createTypeSymbol, createFieldSymbol } from "../../symbols/03_factories.js";
import { Generics, GenericsProps, WhereClause, WhereClauseProps } from "../0_primitives/0_Generics.js";
import { Attributes } from "../0_primitives/1_Attributes.js";
import { serdeContainerAttr, serdeFieldAttr, type SerdeContainerConfig, type SerdeFieldConfig } from "../0_primitives/2_Serde.js";

export interface StructFieldProps {
  name: string | Namekey;
  type: Children;
  pub?: boolean;
  attrs?: string[];
  serde?: SerdeFieldConfig;
  refkey?: Refkey;
}

export function StructField(props: StructFieldProps) {
  const sym = createFieldSymbol(props.name, { refkeys: props.refkey });
  const vis = useVisibility(props.pub);
  const allAttrs = [
    ...(props.serde ? [serdeFieldAttr(props.serde)] : []),
    ...(props.attrs ?? []),
  ].filter(Boolean) as string[];
  const fieldAttrs = allAttrs.length > 0
    ? <><Attributes attrs={allAttrs} />{"\n"}</>
    : null;
  return (
    <Declaration symbol={sym}>
      {fieldAttrs}{vis}<Name />: {props.type},
    </Declaration>
  );
}

export interface StructDeclarationProps extends GenericsProps {
  name: string | Namekey;
  pub?: boolean;
  attrs?: string[];
  derive?: string[];
  serde?: SerdeContainerConfig;
  where?: WhereClause[];
  children?: Children;
  refkey?: Refkey;
  // Explicit flag to distinguish "no body" (unit struct) from "empty body" (empty braced struct)
  braced?: boolean;
}

export function StructDeclaration(props: StructDeclarationProps) {
  const sym = createTypeSymbol(props.name, "struct", { refkeys: props.refkey });
  const scope = createNamedTypeScope(sym);

  const vis = useVisibility(props.pub);

  const allAttrs = [
    ...(props.derive && props.derive.length > 0 ? [`derive(${props.derive.join(", ")})`] : []),
    ...(props.serde ? [serdeContainerAttr(props.serde)] : []),
    ...(props.attrs ?? []),
  ].filter(Boolean) as string[];
  const attrsBlock = allAttrs.length > 0
    ? <><Attributes attrs={allAttrs} />{"\n"}</>
    : null;

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
  serde?: SerdeContainerConfig;
  fields: Children[];
  refkey?: Refkey;
}

export function TupleStructDeclaration(props: TupleStructDeclarationProps) {
  const sym = createTypeSymbol(props.name, "struct", { refkeys: props.refkey });
  const vis = useVisibility(props.pub);

  const allAttrs = [
    ...(props.derive && props.derive.length > 0 ? [`derive(${props.derive.join(", ")})`] : []),
    ...(props.serde ? [serdeContainerAttr(props.serde)] : []),
    ...(props.attrs ?? []),
  ].filter(Boolean) as string[];
  const attrsBlock = allAttrs.length > 0
    ? <><Attributes attrs={allAttrs} />{"\n"}</>
    : null;

  return (
    <Declaration symbol={sym}>
      {attrsBlock}{vis}struct <Name /><Generics {...props} />(<For each={props.fields} joiner=", ">{(f) => f}</For>);
    </Declaration>
  );
}
