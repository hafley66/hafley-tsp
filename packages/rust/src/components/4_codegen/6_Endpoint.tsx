import type { Refkey } from "@alloy-js/core";
import { FunctionDeclaration, type FunctionParam } from "../1_declarations/4_FunctionDeclaration.js";
import { Reference } from "../2_references/0_Reference.js";
import { AppendTo } from "./0_AppendZone.js";
import { ReplaceFile, AutoZone, ManualZone } from "./3_ReplaceFile.js";
import type { ClassifiedParam, TransportBinding, OperationInfo } from "./5_TransportBinding.js";
import { httpBinding, wsBinding } from "./5_TransportBinding.js";

export interface EndpointProps {
  name: string;
  path: string;
  method: "get" | "post" | "put" | "patch" | "delete";
  params?: ClassifiedParam[];
  responseModel: Refkey;
  responseList?: boolean;
  routePath: string;
  transports?: Array<"http" | "ws">;
  existingFile?: string;
}

const BINDING_FACTORIES = {
  http: httpBinding,
  ws: wsBinding,
} as const;

export function Endpoint(props: EndpointProps) {
  const params = props.params ?? [];
  const transports = props.transports ?? ["http"];

  const op: OperationInfo = {
    name: props.name,
    path: props.path,
    method: props.method,
    params,
    routePath: props.routePath,
    responseRefkey: props.responseModel,
    responseList: props.responseList,
  };

  const bindings: TransportBinding[] = transports.map((t) => BINDING_FACTORIES[t](op));

  const allUses = [...new Set(bindings.flatMap((b) => b.uses))].sort();

  const manualParams: FunctionParam[] = params.map((p) => ({
    name: p.name,
    type: p.rustType,
  }));

  const manualReturnType = props.responseList
    ? <>Vec&lt;<Reference refkey={props.responseModel} />&gt;</>
    : <Reference refkey={props.responseModel} />;

  const unusedBindings = params.map((p) => `let _ = ${p.name};`);
  const manualBody = [...unusedBindings, "todo!()"].join("\n");

  return (
    <ReplaceFile
      path={props.name + ".rs"}
      existingFile={props.existingFile}
      externalUses={allUses}
    >
      {bindings.map((b) => (
        <AutoZone id={b.id}>
          <FunctionDeclaration
            name={props.name + b.fnSuffix}
            async
            params={b.handlerParams}
            returns={b.returnType}
          >
            {b.body}
          </FunctionDeclaration>
        </AutoZone>
      ))}
      <ManualZone>
        <FunctionDeclaration
          name={props.name}
          async
          params={manualParams}
          returns={manualReturnType}
        >
          {manualBody}
        </FunctionDeclaration>
      </ManualZone>
      {bindings.map((b) => (
        <AppendTo zone={b.routerZone}>
          {b.routeRegistration}
        </AppendTo>
      ))}
    </ReplaceFile>
  );
}
