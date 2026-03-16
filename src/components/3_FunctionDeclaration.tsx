import { Block, Children, Declaration, For, Name, Namekey, Refkey, Scope } from "@alloy-js/core";
import { createFunctionScope } from "../scopes/6_factories.js";
import { createFunctionSymbol, createParameterSymbol } from "../symbols/3_factories.js";
import { Generics, GenericsProps, WhereClause, WhereClauseProps } from "./0_Generics.js";
import { Attributes } from "./0a_Attributes.js";

export interface FunctionParam {
  name: string;
  type?: Children;
}

export interface FunctionDeclarationProps extends GenericsProps {
  name: string | Namekey;
  pub?: boolean;
  async?: boolean;
  attrs?: string[];
  selfParam?: "&" | "&mut" | "owned";
  params?: FunctionParam[];
  returns?: Children;
  where?: WhereClause[];
  children?: Children;
  refkey?: Refkey;
}

export function FunctionDeclaration(props: FunctionDeclarationProps) {
  const sym = createFunctionSymbol(props.name, { refkeys: props.refkey });
  const scope = createFunctionScope();

  const attrsBlock = props.attrs && props.attrs.length > 0
    ? <><Attributes attrs={props.attrs} />{"\n"}</>
    : null;
  const vis = props.pub ? "pub " : "";
  const asyncKw = props.async ? "async " : "";

  const selfStr = props.selfParam === "&" ? "&self"
    : props.selfParam === "&mut" ? "&mut self"
    : props.selfParam === "owned" ? "self"
    : null;

  const params = props.params ?? [];
  const allParams = selfStr ? [{ name: selfStr } as FunctionParam, ...params] : params;
  const paramList = allParams.length > 0
    ? <For each={allParams} joiner=", ">{(p: FunctionParam) =>
        p.type ? <>{p.name}: {p.type}</> : <>{p.name}</>
      }</For>
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

  return (
    <Declaration symbol={sym}>
      <Scope value={scope}>
        {attrsBlock}{vis}{asyncKw}fn <Name /><Generics {...props} />({paramList}){returnType}{whereClause} {body}
      </Scope>
    </Declaration>
  );
}
