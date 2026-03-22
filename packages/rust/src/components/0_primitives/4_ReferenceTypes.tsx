import { Children } from "@alloy-js/core";

// Wraps a type in &T
export function Ref(props: { mut?: boolean; lifetime?: string; children: Children }) {
  const lt = props.lifetime ? `'${props.lifetime} ` : "";
  const mutKw = props.mut ? "mut " : "";
  return <>&amp;{lt}{mutKw}{props.children}</>;
}

// Wraps a type in Box<T>
export function BoxType(props: { children: Children }) {
  return <>Box&lt;{props.children}&gt;</>;
}

// Wraps a type in Rc<T>
export function RcType(props: { children: Children }) {
  return <>Rc&lt;{props.children}&gt;</>;
}

// Wraps a type in Arc<T>
export function ArcType(props: { children: Children }) {
  return <>Arc&lt;{props.children}&gt;</>;
}

// Wraps a type in Option<T>
export function OptionType(props: { children: Children }) {
  return <>Option&lt;{props.children}&gt;</>;
}

// Wraps a type in Vec<T>
export function VecType(props: { children: Children }) {
  return <>Vec&lt;{props.children}&gt;</>;
}

// Wraps a type in Result<T, E>
export function ResultType(props: { ok: Children; err: Children }) {
  return <>Result&lt;{props.ok}, {props.err}&gt;</>;
}
