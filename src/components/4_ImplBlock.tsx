import { Block, Children } from "@alloy-js/core";
import { Generics, GenericsProps, WhereClause, WhereClauseProps } from "./0_Generics.js";

export interface ImplBlockProps extends GenericsProps {
  // The type being implemented on, e.g. "Foo" or "Foo<T>"
  target: Children;
  // If present, this is a trait impl: `impl Trait for Target`
  trait?: Children;
  where?: WhereClause[];
  children?: Children;
}

export function ImplBlock(props: ImplBlockProps) {
  const whereClause = props.where && props.where.length > 0
    ? <WhereClause clauses={props.where} />
    : null;

  const traitPart = props.trait
    ? <>{props.trait} for </>
    : null;

  const body = props.children !== undefined && props.children !== null
    ? <Block>{props.children}</Block>
    : <>{"{ }"}</>;

  return <>
    impl<Generics {...props} /> {traitPart}{props.target}{whereClause} {body}
  </>;
}
