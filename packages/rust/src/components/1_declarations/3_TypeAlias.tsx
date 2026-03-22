import { Children, Declaration, Name, Namekey, Refkey } from "@alloy-js/core";
import { useVisibility } from "../../scopes/06_contexts.js";
import { createTypeSymbol } from "../../symbols/03_factories.js";
import { Generics, GenericsProps, WhereClause, WhereClauseProps } from "../0_primitives/0_Generics.js";
import { Attributes } from "../0_primitives/1_Attributes.js";

export interface TypeAliasProps extends GenericsProps {
  name: string | Namekey;
  pub?: boolean;
  attrs?: string[];
  where?: WhereClause[];
  children: Children; // the aliased type
  refkey?: Refkey;
}

// Renders `type Foo<T> = Bar<T>;` or `type Foo = Bar;`
export function TypeAlias(props: TypeAliasProps) {
  const sym = createTypeSymbol(props.name, "type", { refkeys: props.refkey });
  const vis = useVisibility(props.pub);

  const attrsBlock = props.attrs && props.attrs.length > 0
    ? <><Attributes attrs={props.attrs} />{"\n"}</>
    : null;

  const whereClause = props.where && props.where.length > 0
    ? <WhereClause clauses={props.where} />
    : null;

  return (
    <Declaration symbol={sym}>
      {attrsBlock}{vis}type <Name /><Generics {...props} />{whereClause} = {props.children};
    </Declaration>
  );
}
