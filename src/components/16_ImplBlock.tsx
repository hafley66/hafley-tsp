import { Block, Children, Scope } from "@alloy-js/core";
import { createFunctionScope } from "../scopes/07_factories.js";
import { Generics, GenericsProps, WhereClause, WhereClauseProps } from "./00_Generics.js";

export interface ImplBlockProps extends GenericsProps {
  // The type being implemented on, e.g. "Foo" or "Foo<T>"
  target: Children;
  // If present, this is a trait impl: `impl Trait for Target`
  trait?: Children;
  where?: WhereClause[];
  children?: Children;
}

export function ImplBlock(props: ImplBlockProps) {
  // impl blocks get a lexical scope so methods inside can create function symbols
  const scope = createFunctionScope();

  const whereClause = props.where && props.where.length > 0
    ? <WhereClause clauses={props.where} />
    : null;

  const traitPart = props.trait
    ? <>{props.trait} for </>
    : null;

  const body = props.children !== undefined && props.children !== null
    ? <Scope value={scope}><Block>{props.children}</Block></Scope>
    : <>{"{ }"}</>;

  return <>
    impl<Generics {...props} /> {traitPart}{props.target}{whereClause} {body}
  </>;
}
