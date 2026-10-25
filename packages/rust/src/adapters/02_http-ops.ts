// The @typespec/http ops, collected once; clap and axum both project from this.
// Domain models come from programToTypeDefs; ops reference them by name only.

import { getDoc, isErrorModel, type Operation, type Program, type Type, type Union } from "@typespec/compiler";
import { getAllHttpServices, type HttpOperation } from "@typespec/http";
import { getStreamOf, isStream } from "@typespec/streams";
import type { ErrorDef, OperationDef, OperationParam, ParamSource, ServiceDef, TypeDef, UnionDef } from "../emitter/00_types.js";
import { pascalCase } from "../emitter/04_ops-plan.js";
import { cliOf, mapPropertyType, paramValue, programToTypeDefs, type MapContext } from "./00_typespec-to-neutral.js";
import { getClapOperation, getClapRoot } from "@hafley/typespec-decorator-def";
import { getDaemon } from "@hafley/typespec-decorator-def";

function streamItem(program: Program, t: Type): Type | undefined {
  return t.kind === "Model" && isStream(program, t) ? getStreamOf(program, t) : undefined;
}

// The success half of a return type: @error variants travel as OpError, not as the Ok value.
function successType(program: Program, t: Type): Type | undefined {
  if (t.kind !== "Union") return t;
  const ok = [...t.variants.values()].filter(v => !isErrorModel(program, v.type));
  if (ok.length === t.variants.size) return t;
  if (ok.length === 0) return undefined;
  if (ok.length === 1) return ok[0]!.type;
  return { ...t, name: undefined, variants: new Map(ok.map(v => [v.name, v])) } as Union;
}

function returnType(program: Program, op: Operation, ctx: MapContext): Pick<OperationDef, "returns" | "returnsStream"> {
  const t = successType(program, op.returnType);
  if (!t || (t.kind === "Intrinsic" && (t.name === "void" || t.name === "never"))) return {};
  const item = streamItem(program, t);
  const returnsCtx = { ...ctx, name: pascalCase(op.name) + "Returns" };
  return item ? { returns: mapPropertyType(item, returnsCtx), returnsStream: true } : { returns: mapPropertyType(t, returnsCtx) };
}

// Every @error model an op can answer with, by the status openapi3 gives it (`default` -> 500).
function errorDefs(program: Program, http: HttpOperation): ErrorDef[] {
  return http.responses.flatMap(r =>
    r.type.kind === "Model" && r.type.name && isErrorModel(program, r.type)
      ? [{ name: r.type.name, status: typeof r.statusCodes === "number" ? r.statusCodes : 500 }]
      : [],
  );
}

function operationDef(program: Program, http: HttpOperation, daemon: boolean, unions: Map<Union, UnionDef>): OperationDef {
  const ctx: MapContext = { program, unions };
  const sources = new Map<Type, { source: ParamSource; name?: string }>();
  for (const p of http.parameters.parameters) {
    if (p.type === "path" || p.type === "query" || p.type === "header") sources.set(p.param, { source: p.type, ...(p.type === "header" ? { name: p.name } : {}) });
  }
  const params: OperationParam[] = [];
  const spreadModels = new Set<string>();
  for (const [, prop] of http.operation.parameters.properties) {
    // A TypeSpec model spread stays one clap flatten field. Its HTTP shape is
    // flattened by serde; the source property identifies the shared model.
    const spread = prop.sourceProperty?.model;
    if (spread?.name) {
      if (!spreadModels.has(spread.name)) {
        spreadModels.add(spread.name);
        params.push({ name: spread.name[0]!.toLowerCase() + spread.name.slice(1), type: { kind: "model", name: spread.name }, source: "body" });
      }
      continue;
    }
    const doc = getDoc(program, prop);
    const value = paramValue(prop.defaultValue);
    const item = streamItem(program, prop.type);
    const propCtx = { ...ctx, name: pascalCase(http.operation.name) + pascalCase(prop.name) };
    const itemType = item && mapPropertyType(item, propCtx);
    const streamFormat = itemType?.kind === "scalar" && itemType.name === "bytes" ? "raw" : "jsonl";
    params.push({
      name: prop.name,
      type: itemType ?? mapPropertyType(prop.type, propCtx),
      source: sources.get(prop)?.source ?? "body",
      ...(sources.get(prop)?.name ? { headerName: sources.get(prop)!.name } : {}),
      ...(item ? { stream: true } : {}),
      ...(item ? { streamFormat } : {}),
      ...(item && http.parameters.body?.contentTypes[0] ? { streamContentType: http.parameters.body.contentTypes[0] } : {}),
      optional: prop.optional || undefined,
      ...(doc !== undefined ? { doc } : {}),
      ...(value !== undefined ? { default: value } : {}),
      ...(cliOf(program, prop) ? { cli: cliOf(program, prop) } : {}),
    });
  }
  const doc = getDoc(program, http.operation);
  const clap = getClapOperation(program, http.operation);
  return {
    name: http.operation.name,
    ...(doc !== undefined ? { doc } : {}),
    ...(clap?.afterHelp ? { afterHelp: clap.afterHelp } : {}),
    ...(clap?.requiredOneOf ? { requiredOneOf: clap.requiredOneOf } : {}),
    ...(clap?.requiredOneOfName ? { requiredOneOfName: clap.requiredOneOfName } : {}),
    verb: http.verb,
    path: daemon ? http.path : http.uriTemplate,
    params,
    ...returnType(program, http.operation, ctx),
    ...(errorDefs(program, http).length ? { errors: errorDefs(program, http).map(e => e.name) } : {}),
  };
}

// The one property of an error model, when it is a required string: the generated code can
// build the model from a message.
function messageField(types: TypeDef[], name: string): string | undefined {
  const def = types.find(t => t.kind === "model" && t.name === name);
  if (def?.kind !== "model" || def.properties.length !== 1) return undefined;
  const [prop] = def.properties;
  return !prop!.optional && prop!.type.kind === "scalar" && prop!.type.name === "string" ? prop!.name : undefined;
}

export interface ProgramOps {
  types: TypeDef[];
  service: ServiceDef;
}

export function programToOps(program: Program): ProgramOps {
  const [services] = getAllHttpServices(program);
  const service = services[0];
  if (!service) throw new Error("programToOps: no @service namespace with http operations");
  const doc = getDoc(program, service.namespace);
  const root = getClapRoot(program, service.namespace);
  const daemon = getDaemon(program, service.namespace);
  const unions = new Map<Union, UnionDef>();
  const types = programToTypeDefs(program, t => getDoc(program, t), unions);
  const hoistedByModels = unions.size;
  const operations = service.operations.map((op: HttpOperation) => operationDef(program, op, !!daemon, unions));
  const errors = new Map<string, ErrorDef>();
  for (const op of service.operations) {
    for (const e of errorDefs(program, op)) {
      const field = messageField(types, e.name);
      if (!errors.has(e.name)) errors.set(e.name, field ? { ...e, field } : e);
    }
  }
  return {
    types: [...types, ...[...unions.values()].slice(hoistedByModels)],
    service: {
      name: service.namespace.name,
      ...(daemon ? { daemon } : {}),
      ...(doc !== undefined ? { doc } : {}),
      ...(root?.args ? { rootArgs: root.args.name } : {}),
      ...(root?.afterHelp ? { afterHelp: root.afterHelp } : {}),
      ...(root?.argsConflictsWithSubcommands ? { argsConflictsWithSubcommands: true } : {}),
      ...(errors.size ? { errors: [...errors.values()] } : {}),
      operations,
    },
  };
}
