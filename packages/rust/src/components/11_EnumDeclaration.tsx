import { Block, Children, Declaration, For, Name, Namekey, Refkey, Scope } from "@alloy-js/core";
import { createNamedTypeScope } from "../scopes/07_factories.js";
import { useVisibility } from "../scopes/06_contexts.js";
import { createTypeSymbol } from "../symbols/03_factories.js";
import { Generics, GenericsProps } from "./00_Generics.js";
import { Attributes } from "./01_Attributes.js";
import { serdeContainerAttr, type SerdeContainerConfig } from "./02_Serde.js";

export interface UnitVariantProps {
  name: string;
}

export function UnitVariant(props: UnitVariantProps) {
  return <>{props.name},</>;
}

export interface TupleVariantProps {
  name: string;
  fields: Children[];
}

export function TupleVariant(props: TupleVariantProps) {
  return <>{props.name}(<For each={props.fields} joiner=", ">{(f) => f}</For>),</>;
}

export interface StructVariantProps {
  name: string;
  children: Children;
}

export function StructVariant(props: StructVariantProps) {
  return <>{props.name} <Block>{props.children}</Block>,</>;
}

export interface EnumDeclarationProps extends GenericsProps {
  name: string | Namekey;
  pub?: boolean;
  attrs?: string[];
  derive?: string[];
  serde?: SerdeContainerConfig;
  children: Children;
  refkey?: Refkey;
}

export function EnumDeclaration(props: EnumDeclarationProps) {
  const sym = createTypeSymbol(props.name, "enum", { refkeys: props.refkey });
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

  return (
    <Declaration symbol={sym}>
      {attrsBlock}{vis}enum <Name /><Generics {...props} /> <Scope value={scope}><Block>{props.children}</Block></Scope>
    </Declaration>
  );
}
