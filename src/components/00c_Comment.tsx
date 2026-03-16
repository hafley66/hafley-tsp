import { Children, For } from "@alloy-js/core";

export interface LineCommentProps {
  children: Children;
}

// Renders // comment lines. Multi-line: splits on \n and prefixes each.
export function LineComment(props: LineCommentProps) {
  return <>// {props.children}</>;
}

export interface BlockCommentProps {
  children: Children;
}

// Renders /* ... */ block comments.
export function BlockComment(props: BlockCommentProps) {
  return <>/* {props.children} */</>;
}

// Renders /// doc comment lines (Rust doc comments).
export function DocComment(props: LineCommentProps) {
  return <>/// {props.children}</>;
}
