import { Children, createScope, createSymbol, Declaration, Indent, Name, Refkey, Scope, useScope } from "@alloy-js/core";
import { CElements, useCNamePolicy } from "./0_name-policy.js";
import { CScope, CSymbol, SPACE_OF } from "./1_scope.js";

// Printer combinators; gen/0_nodes.tsx builds one Rule per grammar.json rule.
export type Rule =
  | { k: "lit"; s: string } | { k: "field"; n: string } | { k: "child" } | { k: "kw"; set: string[] }
  | { k: "nl" } | { k: "blank" } | { k: "seq"; xs: Rule[] } | { k: "choice"; xs: Rule[] } | { k: "rep"; x: Rule; min: number };
export const lit = (s: string): Rule => ({ k: "lit", s });
export const field = (n: string): Rule => ({ k: "field", n });
export const child: Rule = { k: "child" };
export const kw = (set: string[]): Rule => ({ k: "kw", set });
export const nl: Rule = { k: "nl" };
export const blank: Rule = { k: "blank" };
export const seq = (...xs: Rule[]): Rule => ({ k: "seq", xs });
export const choice = (...xs: Rule[]): Rule => ({ k: "choice", xs });
export const opt = (x: Rule): Rule => choice(x, blank);
export const rep = (x: Rule, min: number): Rule => ({ k: "rep", x, min });

type Tok = { lit: string } | { val: Children } | { nl: true };
type Queues = Record<string, Children[]>;
type Pos = Record<string, number>;

// Unparse: enumerate every way the rule consumes the prop queues (a parser over props).
function* run(r: Rule, q: Queues, p: Pos): Generator<[Pos, Tok[]]> {
  switch (r.k) {
    case "lit": yield [p, [{ lit: r.s }]]; return;
    case "nl": yield [p, [{ nl: true }]]; return;
    case "blank": yield [p, []]; return;
    case "field": case "child": {
      const n = r.k === "field" ? r.n : "children";
      const i = p[n] ?? 0;
      if (i < (q[n]?.length ?? 0)) yield [{ ...p, [n]: i + 1 }, [{ val: q[n][i] }]];
      return;
    }
    case "kw": {
      const i = p.keywords ?? 0;
      const w = q.keywords?.[i];
      if (typeof w === "string" && r.set.includes(w)) yield [{ ...p, keywords: i + 1 }, [{ val: w }]];
      return;
    }
    case "choice": for (const x of r.xs) yield* run(x, q, p); return;
    case "seq": yield* runSeq(r.xs, 0, q, p); return;
    case "rep": yield* runRep(r, 0, q, p); return;
  }
}
function* runSeq(xs: Rule[], i: number, q: Queues, p: Pos): Generator<[Pos, Tok[]]> {
  if (i === xs.length) { yield [p, []]; return; }
  for (const [p1, t1] of run(xs[i], q, p)) for (const [p2, t2] of runSeq(xs, i + 1, q, p1)) yield [p2, [...t1, ...t2]];
}
function* runRep(r: Extract<Rule, { k: "rep" }>, count: number, q: Queues, p: Pos): Generator<[Pos, Tok[]]> {
  for (const [p1, t1] of run(r.x, q, p)) {
    if (JSON.stringify(p1) === JSON.stringify(p)) continue; // no progress
    for (const [p2, t2] of runRep(r, count + 1, q, p1)) yield [p2, [...t1, ...t2]];
  }
  if (count >= r.min) yield [p, []];
}

// Whitespace policy (hand-written, per node kind).
const TIGHT = new Set(["pointer_declarator", "parenthesized_declarator", "function_declarator", "parameter_list"]);
const BLOCK = new Set(["field_declaration_list", "enumerator_list"]);
const LINES = new Set(["translation_unit"]);
const isLit = (t: Tok | undefined, s: string) => !!t && "lit" in t && t.lit === s;

function inline(kind: string, toks: Tok[]): Children[] {
  const out: Children[] = [];
  toks.forEach((t, i) => {
    const prev = toks[i - 1];
    const space = TIGHT.has(kind)
      ? isLit(prev, ",")
      : prev && !isLit(prev, "(") && ![";", ",", ")"].some((s) => isLit(t, s));
    if (i > 0 && space) out.push(" ");
    out.push("lit" in t ? t.lit : "val" in t ? t.val : <hbr />);
  });
  return out;
}

function layout(kind: string, toks: Tok[]): Children {
  if (LINES.has(kind)) return toks.map((t, i) => [i > 0 ? <hbr /> : "", inline(kind, [t])]);
  if (!BLOCK.has(kind)) return inline(kind, toks);
  const groups: Tok[][] = [];
  for (const t of toks.slice(1, -1)) ("val" in t || groups.length === 0 ? groups.push([t]) : groups.at(-1)!.push(t));
  if (groups.length === 0) return "{}";
  return ["{", <Indent hardline trailingBreak>{groups.map((g, i) => [i > 0 ? <hbr /> : "", inline(kind, g)])}</Indent>, "}"];
}

const present = (v: unknown) => v !== undefined && v !== null && v !== false && v !== "";

export interface NodeProps {
  kind: string;
  props: Record<string, any>;
  rule: Rule;
  multi: string[];
  def?: string;
  scope?: boolean;
}

export function Node(p: NodeProps) {
  const q: Queues = {};
  for (const [k, v] of Object.entries(p.props)) {
    if (!present(v) || k === "refkey") continue;
    q[k] = k === "children" || k === "keywords" || p.multi.includes(k) ? [v].flat(Infinity).filter(present) : [v];
  }
  if (p.def && typeof q[p.def]?.[0] === "string") {
    const scope = useScope() as CScope;
    const sym = createSymbol(CSymbol, q[p.def][0] as string, scope.spaceFor(SPACE_OF[p.kind as CElements])!, {
      refkeys: p.props.refkey as Refkey | undefined,
      namePolicy: useCNamePolicy().for(p.kind as CElements),
      binder: scope.binder,
    });
    q[p.def][0] = <Declaration symbol={sym}><Name /></Declaration>;
  }
  let best: Tok[] | undefined;
  let bestLits = Infinity;
  for (const [pos, toks] of run(p.rule, q, {})) {
    if (Object.keys(q).some((k) => (pos[k] ?? 0) !== q[k].length)) continue;
    const lits = toks.filter((t) => "lit" in t).length;
    if (lits < bestLits) [best, bestLits] = [toks, lits];
  }
  if (!best) throw new Error(`${p.kind}: props ${Object.keys(q)} do not fit the grammar rule`);
  const body = layout(p.kind, best);
  if (!p.scope) return body;
  const scope = createScope(CScope, p.kind, useScope() as CScope | undefined);
  return <Scope value={scope}>{body}</Scope>;
}

export function Leaf(p: { kind: string; children: Children }) {
  return <>{p.children}</>;
}
