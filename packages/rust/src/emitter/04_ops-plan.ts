// Per-op field plans shared by the clap and axum projections. Pure data: the
// components in 4_codegen/7_OpsTransports.tsx only render what this decides.

import type { Refkey } from "@alloy-js/core";
import { mapType, wrapOptional, type RefkeyRegistry, type RustType } from "./01_type-map.js";
import type {
  EnumDef,
  ModelDef,
  ModelProperty,
  OperationDef,
  OperationParam,
  ParamValue,
  ServiceDef,
  TypeDef,
} from "./00_types.js";

const RUST_KEYWORDS = new Set([
  "as", "async", "await", "break", "const", "continue", "crate", "dyn", "else", "enum", "extern",
  "false", "fn", "for", "if", "impl", "in", "let", "loop", "match", "mod", "move", "mut", "pub",
  "ref", "return", "self", "Self", "static", "struct", "super", "trait", "true", "type", "unsafe",
  "use", "where", "while", "abstract", "become", "box", "do", "final", "macro", "override", "priv",
  "typeof", "unsized", "virtual", "yield", "try", "gen",
]);

export function rustIdent(name: string): string {
  return RUST_KEYWORDS.has(name) ? `r#${name}` : name;
}

export function pascalCase(name: string): string {
  return name
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map(part => part[0]!.toUpperCase() + part.slice(1))
    .join("");
}

function docAttr(doc: string | undefined): string[] {
  if (doc === undefined) return [];
  return [`doc = ${JSON.stringify(doc)}`];
}

function isBool(t: ModelProperty["type"]): boolean {
  return t.kind === "scalar" && t.name === "boolean";
}

function rustLiteral(value: ParamValue, t: ModelProperty["type"]): string {
  if (typeof value === "string") {
    return t.kind === "enum" ? `${t.name}::${pascalCase(value)}` : `String::from(${JSON.stringify(value)})`;
  }
  return String(value);
}

function defaultAttr(value: ParamValue | undefined): string[] {
  if (value === undefined) return [];
  if (typeof value === "string") return [`default_value = ${JSON.stringify(value)}`];
  return [`default_value_t = ${value}`];
}

// clap field type: bool stays a flag, arrays repeat, defaults drop the Option.
export function cliFieldType(prop: ModelProperty, registry: RefkeyRegistry): RustType {
  const base = mapType(prop.type, registry);
  if (isBool(prop.type) || prop.type.kind === "array" || prop.default !== undefined) return base;
  return prop.optional ? wrapOptional(base) : base;
}

export type CliRole = "positional" | "flag" | "flatten" | "stream";

export interface FieldPlan {
  param: OperationParam;
  field: string;
  role: CliRole;
  cliType: RustType;
  cliAttrs: string[];
}

function roleOf(param: OperationParam): CliRole {
  if (param.stream) return "stream";
  if (param.source === "path") return "positional";
  if (param.source === "body" && param.type.kind === "model") return "flatten";
  return "flag";
}

function flagAttrs(prop: ModelProperty): string {
  const parts = ["long", ...(prop.type.kind === "enum" ? ["value_enum"] : []), ...defaultAttr(prop.default)];
  return `arg(${parts.join(", ")})`;
}

function fieldPlan(param: OperationParam, registry: RefkeyRegistry): FieldPlan {
  const role = roleOf(param);
  const cliAttrs = [
    ...docAttr(param.doc),
    ...(role === "flatten" ? ["command(flatten)"] : role === "flag" ? [flagAttrs(param)] : []),
  ];
  const cliType = role === "flatten" || role === "stream" ? mapType(param.type, registry) : cliFieldType(param, registry);
  return { param, field: rustIdent(param.name), role, cliType, cliAttrs };
}

export interface OpPlan {
  op: OperationDef;
  fn: string;
  variant: string;
  argsName: string;
  argsKey: Refkey;
  fields: FieldPlan[]; // the <Op>Args fields; a stream input is never one of them
  input: FieldPlan | undefined; // JsonlStream<T> request body, arrives as an Iterator
  returns: RustType | undefined;
  returnsStream: boolean;
}

export function planOps(service: ServiceDef, registry: RefkeyRegistry, newKey: () => Refkey): OpPlan[] {
  return service.operations.map(op => {
    const all = op.params.map(p => fieldPlan(p, registry));
    return {
      op,
      fn: rustIdent(op.name),
      variant: pascalCase(op.name),
      argsName: pascalCase(op.name) + "Args",
      argsKey: newKey(),
      fields: all.filter(f => f.role !== "stream"),
      input: all.find(f => f.role === "stream"),
      returns: op.returns ? mapType(op.returns, registry) : undefined,
      returnsStream: op.returnsStream ?? false,
    };
  });
}

// What the ops add to the domain types tsp-rust already emits: derives and
// field attrs only. The structs themselves are never re-declared here.
export interface ModelExtras {
  derives: string[];
  fieldAttrs: Map<string, string[]>;
}

export function domainExtras(types: TypeDef[], service: ServiceDef): Map<string, ModelExtras> {
  const byName = new Map(types.map(t => [t.name, t]));
  const extras = new Map<string, ModelExtras>();
  const enumsUsed = new Set<string>();
  const noteEnum = (t: ModelProperty["type"]) => {
    if (t.kind === "enum") enumsUsed.add(t.name);
    if (t.kind === "array" && t.element.kind === "enum") enumsUsed.add(t.element.name);
  };
  for (const op of service.operations) {
    for (const p of op.params) {
      noteEnum(p.type);
      if (roleOf(p) !== "flatten" || p.type.kind !== "model") continue;
      const model = byName.get(p.type.name);
      if (!model || model.kind !== "model" || extras.has(model.name)) continue;
      const fieldAttrs = new Map<string, string[]>();
      for (const f of (model as ModelDef).properties) {
        noteEnum(f.type);
        fieldAttrs.set(f.name, [...docAttr(f.doc), flagAttrs(f)]);
      }
      extras.set(model.name, { derives: ["clap::Args"], fieldAttrs });
    }
  }
  for (const name of enumsUsed) {
    const def = byName.get(name);
    if (def && def.kind === "enum") extras.set((def as EnumDef).name, { derives: ["clap::ValueEnum"], fieldAttrs: new Map() });
  }
  return extras;
}

// axum side: how each param arrives over HTTP and becomes an <Op>Args field.
export interface HttpField {
  field: string;
  structType: RustType | undefined;
  wildcard: boolean;
  expr: string;
}

function stringType(): RustType {
  return { code: "String", externalUses: [] };
}

export function httpField(plan: FieldPlan, registry: RefkeyRegistry): HttpField {
  const p = plan.param;
  const f = plan.field;
  if (p.source === "path") {
    if (p.type.kind === "array") {
      return {
        field: f,
        structType: wrapOptional(stringType()),
        wildcard: true,
        expr: `path.${f}.map(|s| s.split('/').map(Into::into).collect()).unwrap_or_default()`,
      };
    }
    const base = mapType(p.type, registry);
    return { field: f, structType: p.optional ? wrapOptional(base) : base, wildcard: false, expr: `path.${f}` };
  }
  if (p.source === "query" || p.source === "header") {
    const base = mapType(p.type, registry);
    if (p.type.kind === "array") return { field: f, structType: base, wildcard: false, expr: `query.${f}` };
    if (isBool(p.type)) return { field: f, structType: wrapOptional(base), wildcard: false, expr: `query.${f}.unwrap_or(${p.default ?? false})` };
    if (p.default !== undefined) {
      return { field: f, structType: wrapOptional(base), wildcard: false, expr: `query.${f}.unwrap_or(${rustLiteral(p.default, p.type)})` };
    }
    return { field: f, structType: p.optional ? wrapOptional(base) : base, wildcard: false, expr: `query.${f}` };
  }
  return { field: f, structType: undefined, wildcard: false, expr: "body" };
}

// `/fast{paths}` -> ["/fast", "/fast/{*paths}"]: optional path params also get the route without them.
export function axumRoutes(op: OperationDef): string[] {
  const pathParams = op.params.filter(p => p.source === "path");
  const base = op.path.replace(/\{[^}]*\}/g, "").replace(/\/+$/, "") || "/";
  const segs = pathParams.map(p => (p.type.kind === "array" ? `{*${p.name}}` : `{${p.name}}`));
  const full = pathParams.length ? `${base.replace(/\/$/, "")}/${segs.join("/")}` : base;
  const anyOptional = pathParams.some(p => p.optional);
  return anyOptional && full !== base ? [base, full] : [full];
}

