import { Children, For } from "@alloy-js/core";

export interface AttributeProps {
  children?: Children;
}

// Renders a list of #[...] attributes, one per line, before a declaration.
// Pass an array of attribute strings: ["tokio::main", "serde(rename_all = \"camelCase\")"]
export function Attributes(props: { attrs: string[] }) {
  if (props.attrs.length === 0) return null;
  return (
    <For each={props.attrs} joiner={<><hbr /></>}>
      {(attr: string) => <>#[{attr}]</>}
    </For>
  );
}
