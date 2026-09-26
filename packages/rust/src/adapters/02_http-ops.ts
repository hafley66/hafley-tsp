// The @typespec/http ops, collected once; clap and axum both project from this.
// Domain models come from programToTypeDefs; ops reference them by name only.

import { getDoc, type Operation, type Program, type Type } from "@typespec/compiler";
import { getAllHttpServices, type HttpOperation } from "@typespec/http";
import { getStreamOf, isStream } from "@typespec/streams";
import type { OperationDef, OperationParam, ParamSource, ServiceDef, TypeDef } from "../emitter/00_types.js";
import { cliOf, mapPropertyType, paramValue, programToTypeDefs } from "./00_typespec-to-neutral.js";
import { getClapOperation, getClapRoot } from "../../../decorator-def/src/clap.js";

function streamItem(program: Program, t: Type): Type | undefined {
  return t.kind === "Model" && isStream(program, t) ? getStreamOf(program, t) : undefined;
}

function returnType(program: Program, op: Operation): Pick<OperationDef, "returns" | "returnsStream"> {
  const t: Type = op.returnType;
  if (t.kind === "Intrinsic" && (t.name === "void" || t.name === "never")) return {};
  const item = streamItem(program, t);
  return item ? { returns: mapPropertyType(item), returnsStream: true } : { returns: mapPropertyType(t) };
}

function operationDef(program: Program, http: HttpOperation): OperationDef {
  const sources = new Map<Type, { source: ParamSource; name?: string }>();
  for (const p of http.parameters.parameters) {
    if (p.type === "path" || p.type === "query" || p.type === "header") sources.set(p.param, { source: p.type, ...(p.type === "header" ? { name: p.name } : {}) });
  }
  const params: OperationParam[] = [];
  for (const [, prop] of http.operation.parameters.properties) {
    const doc = getDoc(program, prop);
    const value = paramValue(prop.defaultValue);
    const item = streamItem(program, prop.type);
    params.push({
      name: prop.name,
      type: mapPropertyType(item ?? prop.type),
      source: sources.get(prop)?.source ?? "body",
      ...(sources.get(prop)?.name ? { headerName: sources.get(prop)!.name } : {}),
      ...(item ? { stream: true } : {}),
      optional: prop.optional || undefined,
      ...(doc !== undefined ? { doc } : {}),
      ...(value !== undefined ? { default: value } : {}),
      ...(cliOf(program, prop) ? { cli: cliOf(program, prop) } : {}),
    });
  }
  const doc = getDoc(program, http.operation);
  return {
    name: http.operation.name,
    ...(doc !== undefined ? { doc } : {}),
    ...(getClapOperation(program, http.operation)?.afterHelp ? { afterHelp: getClapOperation(program, http.operation)?.afterHelp } : {}),
    ...(getClapOperation(program, http.operation)?.requiredOneOf ? { requiredOneOf: getClapOperation(program, http.operation)?.requiredOneOf } : {}),
    verb: http.verb,
    path: http.uriTemplate,
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
  return {
    types: programToTypeDefs(program, t => getDoc(program, t)),
    service: {
      name: service.namespace.name,
      ...(doc !== undefined ? { doc } : {}),
      ...(root?.args ? { rootArgs: root.args.name } : {}),
      ...(root?.afterHelp ? { afterHelp: root.afterHelp } : {}),
      ...(root?.argsConflictsWithSubcommands ? { argsConflictsWithSubcommands: true } : {}),
      operations: service.operations.map((op: HttpOperation) => operationDef(program, op)),
    },
  };
}
