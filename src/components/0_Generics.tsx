import { Children, For } from "@alloy-js/core";

export interface LifetimeParam {
  name: string;
  bounds?: string[];
}

export interface TypeParam {
  name: string;
  bounds?: Children[];
}

export interface GenericsProps {
  lifetimes?: LifetimeParam[];
  typeParams?: TypeParam[];
}

export function Generics(props: GenericsProps) {
  const lifetimes = props.lifetimes ?? [];
  const typeParams = props.typeParams ?? [];
  if (lifetimes.length === 0 && typeParams.length === 0) return null;

  const parts: Children[] = [];

  for (const lt of lifetimes) {
    if (lt.bounds && lt.bounds.length > 0) {
      parts.push(<>'{lt.name}: {lt.bounds.map(b => `'${b}`).join(" + ")}</>);
    } else {
      parts.push(<>'{lt.name}</>);
    }
  }

  for (const tp of typeParams) {
    if (tp.bounds && tp.bounds.length > 0) {
      parts.push(<>{tp.name}: <For each={tp.bounds} joiner=" + ">{(b) => b}</For></>);
    } else {
      parts.push(<>{tp.name}</>);
    }
  }

  return <>&lt;<For each={parts} joiner=", ">{(p) => p}</For>&gt;</>;
}

export interface WhereClause {
  target: Children;
  bounds: Children[];
}

export interface WhereClauseProps {
  clauses: WhereClause[];
}

export function WhereClause(props: WhereClauseProps) {
  if (props.clauses.length === 0) return null;

  const parts = props.clauses.map(c =>
    <>{c.target}: <For each={c.bounds} joiner=" + ">{(b) => b}</For></>
  );

  return <>
    {"\n"}where{"\n"}    <For each={parts} joiner={<>,{"\n"}    </>}>{(p) => p}</For>,{"\n"}
  </>;
}
