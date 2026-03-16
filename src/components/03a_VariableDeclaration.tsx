import { Children, Declaration, Name, Namekey, Refkey } from "@alloy-js/core";
import { useVisibility } from "../scopes/05_contexts.js";
import { createFunctionSymbol } from "../symbols/03_factories.js";
import { Attributes } from "./00a_Attributes.js";

export interface ConstDeclarationProps {
  name: string | Namekey;
  pub?: boolean;
  type: Children;
  attrs?: string[];
  children: Children; // the value expression
  refkey?: Refkey;
}

// Renders `const NAME: Type = value;`
export function ConstDeclaration(props: ConstDeclarationProps) {
  // Reuse function symbol factory since consts live in the same declaration space
  const sym = createFunctionSymbol(props.name, { refkeys: props.refkey });
  const vis = useVisibility(props.pub);

  const attrsBlock = props.attrs && props.attrs.length > 0
    ? <><Attributes attrs={props.attrs} />{"\n"}</>
    : null;

  return (
    <Declaration symbol={sym}>
      {attrsBlock}{vis}const <Name />: {props.type} = {props.children};
    </Declaration>
  );
}

export interface StaticDeclarationProps {
  name: string | Namekey;
  pub?: boolean;
  mut?: boolean;
  type: Children;
  attrs?: string[];
  children: Children;
  refkey?: Refkey;
}

// Renders `static NAME: Type = value;` or `static mut NAME: Type = value;`
export function StaticDeclaration(props: StaticDeclarationProps) {
  const sym = createFunctionSymbol(props.name, { refkeys: props.refkey });
  const vis = useVisibility(props.pub);
  const mutKw = props.mut ? "mut " : "";

  const attrsBlock = props.attrs && props.attrs.length > 0
    ? <><Attributes attrs={props.attrs} />{"\n"}</>
    : null;

  return (
    <Declaration symbol={sym}>
      {attrsBlock}{vis}static {mutKw}<Name />: {props.type} = {props.children};
    </Declaration>
  );
}

export interface LetDeclarationProps {
  name: string;
  mut?: boolean;
  type?: Children;
  children?: Children; // initializer
}

// Renders `let name: Type = value;` or `let mut name = value;`
// Not a Declaration (no symbol) -- let bindings are local, not cross-referenceable
export function LetDeclaration(props: LetDeclarationProps) {
  const mutKw = props.mut ? "mut " : "";
  const typePart = props.type ? <>: {props.type}</> : null;
  const valuePart = props.children !== undefined && props.children !== null
    ? <> = {props.children}</>
    : null;

  return <>let {mutKw}{props.name}{typePart}{valuePart};</>;
}
