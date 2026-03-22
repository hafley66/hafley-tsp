import { Children, List } from "@alloy-js/core";
import { FunctionDeclaration, type FunctionParam } from "./14_FunctionDeclaration.js";
import { Reference } from "./20_Reference.js";
import { AppendTo } from "./30_AppendZone.js";
import { CodegenPair, AutoFile, StubFile, ImplCall } from "./31_CodegenPair.js";
import type { Refkey } from "@alloy-js/core";

export interface EndpointParam {
  extractor: string;
  extractorType: string;
  name: string;
  type: string;
}

export interface EndpointProps {
  path: string;
  method: "get" | "post" | "put" | "patch" | "delete";
  name: string;
  routePath: string;
  responseModel: Refkey;
  responseList?: boolean;
  params?: EndpointParam[];
  externalUses?: string[];
  routerZone?: string;
}

export function Endpoint(props: EndpointProps) {
  const zone = props.routerZone ?? "router";
  const params = props.params ?? [];

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

  const implCratePath = "crate::" + props.routePath.replace(/_auto$/, "");
  const implCallArgs = params.map(p => p.name);
  const routeRegistration = `\n.route("${props.path}", ${props.method}(${props.routePath}::${props.name}))`;

  const unusedBindings = params.map(p => `let _ = ${p.name};`);
  const manualBody = [...unusedBindings, "todo!()"].join("\n");

  return (
    <CodegenPair name={props.name} implPath={implCratePath}>
      <AutoFile name={props.name} externalUses={[...new Set(autoExternalUses)].sort()}>
        <FunctionDeclaration
          name={props.name}
          async
          params={autoParams}
          returns={responseType}
        >
          Json(<ImplCall fn={props.name + "_impl"} args={implCallArgs} />.await)
        </FunctionDeclaration>
        <AppendTo zone={zone}>
          {routeRegistration}
        </AppendTo>
      </AutoFile>
      <StubFile name={props.name}>
        <FunctionDeclaration
          name={props.name + "_impl"}
          async
          params={implParams}
          returns={implReturnType}
        >
          {manualBody}
        </FunctionDeclaration>
      </StubFile>
    </CodegenPair>
  );
}
