import { Block, Children, For } from "@alloy-js/core";
import { Generics, GenericsProps, WhereClause, WhereClauseProps } from "./0_Generics.js";

export interface FunctionParam {
  name: string;
  type: Children;
}

export interface FunctionDeclarationProps extends GenericsProps {
  name: string;
  pub?: boolean;
  async?: boolean;
  params?: FunctionParam[];
  returns?: Children;
  where?: WhereClause[];
  children?: Children;
}

export function FunctionDeclaration(props: FunctionDeclarationProps) {
  const vis = props.pub ? "pub " : "";
  const asyncKw = props.async ? "async " : "";

  const params = props.params ?? [];
  const paramList = params.length > 0
    ? <For each={params} joiner=", ">{(p) => <>{p.name}: {p.type}</>}</For>
    : null;

  const returnType = props.returns
    ? <> -&gt; {props.returns}</>
    : null;

  const whereClause = props.where && props.where.length > 0
    ? <WhereClause clauses={props.where} />
    : null;

  const body = props.children !== undefined && props.children !== null
    ? <Block>{props.children}</Block>
    : <>{"{ }"}</>;

  return <>
    {vis}{asyncKw}fn {props.name}<Generics {...props} />({paramList}){returnType}{whereClause} {body}
  </>;
}
