import type { Children, Refkey } from "@alloy-js/core";
import type { FunctionParam } from "../1_declarations/4_FunctionDeclaration.js";
import { Reference } from "../2_references/0_Reference.js";

// ---------------------------------------------------------------------------
// Param classification
// ---------------------------------------------------------------------------

export interface SourcedParam {
  kind: "sourced";
  source: "path" | "query" | "body" | "header";
  name: string;
  rustType: string;
}

export interface ResolvedParam {
  kind: "resolved";
  scope: "per_request" | "shared";
  name: string;
  rustType: string;
  innerTypeRef: Refkey;
}

export type ClassifiedParam = SourcedParam | ResolvedParam;

export type ParamSource = SourcedParam["source"];
export type InjectableScope = ResolvedParam["scope"];

// ---------------------------------------------------------------------------
// Operation info (transport-agnostic input to binding factories)
// ---------------------------------------------------------------------------

export interface OperationInfo {
  name: string;
  path: string;
  method: "get" | "post" | "put" | "patch" | "delete";
  params: ClassifiedParam[];
  responseRefkey: Refkey;
  responseList?: boolean;
  routePath: string;
}

// ---------------------------------------------------------------------------
// Transport binding (what a factory produces -- Children, not strings)
// ---------------------------------------------------------------------------

export interface TransportBinding {
  id: string;
  fnSuffix: string;
  handlerParams: FunctionParam[];
  returnType: Children;
  body: Children;
  uses: string[];
  routeRegistration: Children;
  routerZone: string;
}

export type BindingFactory = (op: OperationInfo) => TransportBinding;

// ---------------------------------------------------------------------------
// Extraction function types
// ---------------------------------------------------------------------------

export interface ExtractedParam {
  handlerParam: FunctionParam;
  delegationArg: string;
  uses: string[];
}

export interface ResolvedExtraction extends ExtractedParam {
  extractionCode?: string;
}

export type ParamExtractorFn = (p: SourcedParam) => ExtractedParam;
export type ResolvedExtractorFn = (p: ResolvedParam) => ResolvedExtraction;

// ---------------------------------------------------------------------------
// Transport registry + exhaustive extraction matrices
// ---------------------------------------------------------------------------

export const TRANSPORT_IDS = ["http", "ws"] as const;
export type TransportId = (typeof TRANSPORT_IDS)[number];

export const SOURCED_EXTRACTORS: Record<TransportId, Record<ParamSource, ParamExtractorFn>> = {
  http: {
    path: (p) => ({
      handlerParam: { name: `Path(${p.name})`, type: `Path<${p.rustType}>` },
      delegationArg: p.name,
      uses: ["axum::extract::Path"],
    }),
    query: (p) => ({
      handlerParam: { name: `Query(${p.name})`, type: `Query<${p.rustType}>` },
      delegationArg: p.name,
      uses: ["axum::extract::Query"],
    }),
    body: (p) => ({
      handlerParam: { name: `Json(${p.name})`, type: `Json<${p.rustType}>` },
      delegationArg: p.name,
      uses: ["axum::Json"],
    }),
    header: (p) => ({
      handlerParam: { name: p.name, type: "HeaderMap" },
      delegationArg: p.name,
      uses: ["axum::http::HeaderMap"],
    }),
  },
  ws: {
    path: (p) => ({
      handlerParam: { name: p.name, type: p.rustType },
      delegationArg: p.name,
      uses: [],
    }),
    query: (p) => ({
      handlerParam: { name: p.name, type: p.rustType },
      delegationArg: p.name,
      uses: [],
    }),
    body: (p) => ({
      handlerParam: { name: p.name, type: p.rustType },
      delegationArg: p.name,
      uses: [],
    }),
    header: (p) => ({
      handlerParam: { name: p.name, type: p.rustType },
      delegationArg: p.name,
      uses: [],
    }),
  },
};

export const RESOLVED_EXTRACTORS: Record<TransportId, Record<InjectableScope, ResolvedExtractorFn>> = {
  http: {
    per_request: (p) => ({
      handlerParam: { name: `Extension(${p.name})`, type: `Extension<${p.rustType}>` },
      delegationArg: p.name,
      uses: ["axum::Extension"],
    }),
    shared: (p) => ({
      handlerParam: { name: `State(${p.name})`, type: `State<${p.rustType}>` },
      delegationArg: p.name,
      uses: ["axum::extract::State"],
    }),
  },
  ws: {
    per_request: (p) => ({
      handlerParam: { name: p.name, type: p.rustType },
      delegationArg: p.name,
      extractionCode: `let ${p.name} = conn.extensions().get::<${p.rustType}>().cloned().unwrap();`,
      uses: [],
    }),
    shared: (p) => ({
      handlerParam: { name: p.name, type: p.rustType },
      delegationArg: p.name,
      extractionCode: `let ${p.name} = conn.state::<${p.rustType}>();`,
      uses: [],
    }),
  },
};

// ---------------------------------------------------------------------------
// Binding factories
// ---------------------------------------------------------------------------

function classifyAndExtract(
  params: ClassifiedParam[],
  transportId: TransportId,
): { handlerParams: FunctionParam[]; delegationArgs: string[]; uses: string[]; extractionLines: string[] } {
  const handlerParams: FunctionParam[] = [];
  const delegationArgs: string[] = [];
  const uses: string[] = [];
  const extractionLines: string[] = [];

  for (const p of params) {
    if (p.kind === "sourced") {
      const extracted = SOURCED_EXTRACTORS[transportId][p.source](p);
      handlerParams.push(extracted.handlerParam);
      delegationArgs.push(extracted.delegationArg);
      uses.push(...extracted.uses);
    } else {
      const extracted = RESOLVED_EXTRACTORS[transportId][p.scope](p);
      if (transportId === "http") {
        handlerParams.push(extracted.handlerParam);
      }
      if (extracted.extractionCode) {
        extractionLines.push(extracted.extractionCode);
      }
      delegationArgs.push(extracted.delegationArg);
      uses.push(...extracted.uses);
    }
  }

  return { handlerParams, delegationArgs, uses, extractionLines };
}

function modelRef(refkey: Refkey, list?: boolean): Children {
  const ref = <Reference refkey={refkey} />;
  return list ? <>Vec&lt;{ref}&gt;</> : ref;
}

export function httpBinding(op: OperationInfo): TransportBinding {
  const { handlerParams, delegationArgs, uses } = classifyAndExtract(op.params, "http");
  const argStr = delegationArgs.join(", ");
  const inner = modelRef(op.responseRefkey, op.responseList);

  return {
    id: "http",
    fnSuffix: "_http",
    handlerParams,
    returnType: <>Json&lt;{inner}&gt;</>,
    body: <>Json({op.name}({argStr}).await)</>,
    uses: ["axum::Json", ...uses],
    routeRegistration: <>{"\n"}.route("{op.path}", {op.method}({op.routePath}::{op.name}_http))</>,
    routerZone: "router",
  };
}

export function wsBinding(op: OperationInfo): TransportBinding {
  const sourcedParams = op.params.filter((p): p is SourcedParam => p.kind === "sourced");
  const resolvedParams = op.params.filter((p): p is ResolvedParam => p.kind === "resolved");

  const msgStructName = pascalCase(op.name) + "Msg";

  const handlerParams: FunctionParam[] = [];
  if (sourcedParams.length > 0) {
    handlerParams.push({ name: "msg", type: msgStructName });
  }
  handlerParams.push({ name: "conn", type: "&WsConnection" });

  const extractionLines: string[] = [];
  const delegationArgs: string[] = [];
  const uses: string[] = [];

  for (const p of resolvedParams) {
    const extracted = RESOLVED_EXTRACTORS.ws[p.scope](p);
    if (extracted.extractionCode) {
      extractionLines.push(extracted.extractionCode);
    }
    delegationArgs.push(extracted.delegationArg);
    uses.push(...extracted.uses);
  }

  for (const p of sourcedParams) {
    delegationArgs.push(`msg.${p.name}`);
  }

  const allArgs = delegationArgs.join(", ");
  const bodyChildren = (
    <>
      {extractionLines.length > 0 && extractionLines.join("\n") + "\n"}
      WsResponse::json({op.name}({allArgs}).await)
    </>
  );

  return {
    id: "ws",
    fnSuffix: "_ws",
    handlerParams,
    returnType: "WsResponse",
    body: bodyChildren,
    uses,
    routeRegistration: <>{"\n"}.on("{op.name}", {op.routePath}::{op.name}_ws)</>,
    routerZone: "ws_router",
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pascalCase(s: string): string {
  return s
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}
