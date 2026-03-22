import { Children, List } from "@alloy-js/core";
import { FunctionDeclaration, type FunctionParam } from "../1_declarations/4_FunctionDeclaration.js";
import { Reference } from "../2_references/0_Reference.js";
import { AppendTo } from "./0_AppendZone.js";
import { ReplaceFile, AutoZone, ManualZone } from "./3_ReplaceFile.js";
import type { Refkey } from "@alloy-js/core";

export interface AxumEndpointParam {
  extractor: string;      // e.g. "Path(org_id)"
  extractorType: string;  // e.g. "Path<i64>"
  name: string;           // e.g. "org_id"
  type: string;           // e.g. "i64"
}

export interface AxumEndpointProps {
  path: string;           // HTTP path, e.g. "/orgs/:id/posts"
  method: "get" | "post" | "put" | "patch" | "delete";
  name: string;           // function name, e.g. "list_users"
  routePath: string;      // crate path for route registration, e.g. "orgs::list_users"
  responseModel: Refkey;
  responseList?: boolean;
  params?: AxumEndpointParam[];
  externalUses?: string[];
  routerZone?: string;
  /** Absolute path to existing file on disk for re-emit. */
  existingFile?: string;
}

export function AxumEndpoint(props: AxumEndpointProps) {
  const zone = props.routerZone ?? "router";
  const params = props.params ?? [];

  // Auto zone: axum handler with extractors, Json wrapping, delegation
  const responseType = props.responseList
    ? <>Json&lt;Vec&lt;<Reference refkey={props.responseModel} />&gt;&gt;</>
    : <>Json&lt;<Reference refkey={props.responseModel} />&gt;</>;

  const implReturnType = props.responseList
    ? <>Vec&lt;<Reference refkey={props.responseModel} />&gt;</>
    : <Reference refkey={props.responseModel} />;

  const autoParams: FunctionParam[] = params.map(p => ({
    name: p.extractor,
    type: p.extractorType,
  }));

  const implParams: FunctionParam[] = params.map(p => ({
    name: p.name,
    type: p.type,
  }));

  const autoExternalUses = ["axum::Json", ...(props.externalUses ?? [])];
  if (params.some(p => p.extractorType.startsWith("Path"))) {
    autoExternalUses.push("axum::extract::Path");
  }

  const implCallArgs = params.map(p => p.name);
  const implCallArgStr = implCallArgs.length > 0 ? implCallArgs.join(", ") : "";
  const routeRegistration = `\n.route("${props.path}", ${props.method}(${props.routePath}::${props.name}))`;

  const unusedBindings = params.map(p => `let _ = ${p.name};`);
  const manualBody = [...unusedBindings, "todo!()"].join("\n");

  return (
    <ReplaceFile
      path={props.name + ".rs"}
      existingFile={props.existingFile}
      externalUses={[...new Set(autoExternalUses)].sort()}
    >
      <AutoZone id="handler">
        <FunctionDeclaration
          name={props.name}
          async
          params={autoParams}
          returns={responseType}
        >
          Json({props.name}_impl({implCallArgStr}).await)
        </FunctionDeclaration>
      </AutoZone>
      <ManualZone>
        <FunctionDeclaration
          name={props.name + "_impl"}
          async
          params={implParams}
          returns={implReturnType}
        >
          {manualBody}
        </FunctionDeclaration>
      </ManualZone>
      <AppendTo zone={zone}>
        {routeRegistration}
      </AppendTo>
    </ReplaceFile>
  );
}
