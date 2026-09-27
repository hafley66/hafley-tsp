// The @typespec/http ops, collected once; clap and axum both project from this.
// Domain models come from programToTypeDefs; ops reference them by name only.

import { getDoc, type Operation, type Program, type Type } from "@typespec/compiler";
import { getAllHttpServices, type HttpOperation } from "@typespec/http";
import { getStreamOf, isStream } from "@typespec/streams";
import type { OperationDef, OperationParam, ParamSource, ServiceDef, TypeDef } from "../emitter/00_types.js";
import { cliOf, mapPropertyType, paramValue, programToTypeDefs } from "./00_typespec-to-neutral.js";
import { getClapOperation, getClapRoot } from "../../../decorator-def/src/clap.js";
import { getDaemon } from "../../../decorator-def/src/daemon.js";

function streamItem(program: Program, t: Type): Type | undefined {
  return t.kind === "Model" && isStream(program, t) ? getStreamOf(program, t) : undefined;
}

function returnType(program: Program, op: Operation): Pick<OperationDef, "returns" | "returnsStream"> {
  const t: Type = op.returnType;
  if (t.kind === "Intrinsic" && (t.name === "void" || t.name === "never")) return {};
  const item = streamItem(program, t);
  return item ? { returns: mapPropertyType(item), returnsStream: true } : { returns: mapPropertyType(t) };
}

function operationDef(program: Program, http: HttpOperation, daemon: boolean): OperationDef {
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
    const itemType = item && mapPropertyType(item);
    const streamFormat = itemType?.kind === "scalar" && itemType.name === "bytes" ? "raw" : "jsonl";
    params.push({
      name: prop.name,
      type: itemType ?? mapPropertyType(prop.type),
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
    ...returnType(program, http.operation),
  };
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
  return {
    types: programToTypeDefs(program, t => getDoc(program, t)),
    service: {
      name: service.namespace.name,
      ...(daemon ? { daemon } : {}),
      ...(doc !== undefined ? { doc } : {}),
      ...(root?.args ? { rootArgs: root.args.name } : {}),
      ...(root?.afterHelp ? { afterHelp: root.afterHelp } : {}),
      ...(root?.argsConflictsWithSubcommands ? { argsConflictsWithSubcommands: true } : {}),
      operations: service.operations.map((op: HttpOperation) => operationDef(program, op, !!daemon)),
    },
  };
}
