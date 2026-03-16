import { Block, Children, For } from "@alloy-js/core";
import { Generics, GenericsProps, WhereClause, WhereClauseProps } from "./0_Generics.js";

export interface StructFieldProps {
  name: string;
  type: Children;
  pub?: boolean;
}

export function StructField(props: StructFieldProps) {
  return <>{props.pub ? "pub " : ""}{props.name}: {props.type},</>;
}

export interface StructDeclarationProps extends GenericsProps {
  name: string;
  pub?: boolean;
  derive?: string[];
  where?: WhereClause[];
  children?: Children;
  // Explicit flag to distinguish "no body" (unit struct) from "empty body" (empty braced struct)
  braced?: boolean;
}

export function StructDeclaration(props: StructDeclarationProps) {
  const derive = props.derive && props.derive.length > 0
    ? <>#[derive({props.derive.join(", ")})]{"\n"}</>
    : null;

  const vis = props.pub ? "pub " : "";

  const whereClause = props.where && props.where.length > 0
    ? <WhereClause clauses={props.where} />
    : null;

  const hasBody = props.children !== undefined && props.children !== null;

  if (!hasBody && !props.braced) {
    if (whereClause) {
      return <>{derive}{vis}struct {props.name}<Generics {...props} />{whereClause}{"{}"}</>;
    }
    return <>{derive}{vis}struct {props.name}<Generics {...props} />;</>;
  }

  if (!hasBody && props.braced) {
    return <>{derive}{vis}struct {props.name}<Generics {...props} />{whereClause} {"{}"}</>;
  }

  return <>
    {derive}{vis}struct {props.name}<Generics {...props} />{whereClause} <Block>{props.children}</Block>
  </>;
}

export interface TupleStructDeclarationProps extends GenericsProps {
  name: string;
  pub?: boolean;
  derive?: string[];
  fields: Children[];
}

export function TupleStructDeclaration(props: TupleStructDeclarationProps) {
  const derive = props.derive && props.derive.length > 0
    ? <>#[derive({props.derive.join(", ")})]{"\n"}</>
    : null;

  const vis = props.pub ? "pub " : "";

  return <>{derive}{vis}struct {props.name}<Generics {...props} />(<For each={props.fields} joiner=", ">{(f) => f}</For>);</>;
}
