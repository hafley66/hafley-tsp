import { Block, Children, For, List } from "@alloy-js/core";
import { Generics, GenericsProps } from "./0_Generics.js";

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
  name: string;
  pub?: boolean;
  derive?: string[];
  children: Children;
}

export function EnumDeclaration(props: EnumDeclarationProps) {
  const derive = props.derive && props.derive.length > 0
    ? <>#[derive({props.derive.join(", ")})]{"\n"}</>
    : null;

  const vis = props.pub ? "pub " : "";

  return <>
    {derive}{vis}enum {props.name}<Generics {...props} /> <Block>{props.children}</Block>
  </>;
}
