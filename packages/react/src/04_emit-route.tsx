// Emits a single TanStack Router route file with auto/manual zones.
// Reuses component type emission from 02_emit-component.tsx patterns.

import { List, refkey, type Refkey } from "@alloy-js/core";
import * as ts from "@alloy-js/typescript";
import {
  InterfaceDeclaration as TspInterface,
  InterfaceMember as TspInterfaceMember,
} from "@typespec/emitter-framework/typescript";
import type { Model, Union, ModelProperty, UnionVariant } from "@typespec/compiler";
import type { RouteDef } from "./00_types.js";

const EF_PREFIX = Symbol.for("emitter-framework:typescript");
function efRefkey(...args: unknown[]): Refkey {
  return refkey(EF_PREFIX, ...args);
}

const AUTO_MARKER = "// --- AUTO-GENERATED (do not edit above this line) ---";
const MANUAL_MARKER = "// --- MANUAL (edit below this line) ---";

function toCamelCase(name: string): string {
  return name.charAt(0).toLowerCase() + name.slice(1);
}

function hasDefault(prop: ModelProperty): boolean {
  return prop.defaultValue !== undefined;
}

function defaultToString(prop: ModelProperty): string | null {
  const val = prop.defaultValue;
  if (val === undefined) return null;
  switch (val.valueKind) {
    case "StringValue": return JSON.stringify(val.value);
    case "NumericValue": return String(val.value.asNumber());
    case "BooleanValue": return String(val.value);
    case "ScalarValue": return JSON.stringify(String(val.value));
    default: return "null";
  }
}

function EventInterface(props: { variant: UnionVariant; refkey: Refkey }) {
  const variantType = props.variant.type;
  const name = variantType.kind === "Model" ? variantType.name : String(props.variant.name);
  const discriminant = String(props.variant.name);
  const isModel = variantType.kind === "Model";
  const modelProps = isModel ? Array.from((variantType as Model).properties.values()) : [];

  return (
    <ts.InterfaceDeclaration name={name} refkey={props.refkey}>
      <List hardline>
        <ts.InterfaceMember name="type" type={`"${discriminant}"`} />
        {modelProps.map(p => (
          <TspInterfaceMember type={p} />
        ))}
      </List>
    </ts.InterfaceDeclaration>
  );
}

function EventUnionType(props: {
  name: string;
  refkey: Refkey;
  variantRefkeys: { name: string; refkey: Refkey }[];
}) {
  return (
    <ts.TypeDeclaration export name={props.name} refkey={props.refkey}>
      {props.variantRefkeys.map((v, i) => (
        <>{i > 0 ? " | " : ""}{v.refkey}</>
      ))}
    </ts.TypeDeclaration>
  );
}

function DefaultsConst(props: {
  stateName: string;
  stateRefkey: Refkey;
  stateModel: Model;
}) {
  const allProps = Array.from(props.stateModel.properties.values());
  const propsWithDefaults = allProps.filter(hasDefault);
  const allRequiredHaveDefaults = allProps.every(p => p.optional || hasDefault(p));
  if (!allRequiredHaveDefaults) return null;

  const fields = propsWithDefaults.map(p => {
    const val = defaultToString(p);
    return `  ${p.name}: ${val},`;
  }).join("\n");

  const constName = `${toCamelCase(props.stateName)}Defaults`;

  return (
    <ts.VarDeclaration export const name={constName} type={props.stateRefkey}>
      {`{\n${fields}\n}`}
    </ts.VarDeclaration>
  );
}

function ReducerFunction(props: {
  stateName: string;
  stateRefkey: Refkey;
  unionRefkey: Refkey;
  variants: UnionVariant[];
}) {
  const fnName = `${toCamelCase(props.stateName)}Reducer`;
  const cases = props.variants.map(v => {
    const name = String(v.name);
    const disc = toCamelCase(name);
    return `    case "${disc}":\n      // TODO: handle ${name}\n      return state;`;
  }).join("\n");

  return (
    <ts.FunctionDeclaration
      export
      name={fnName}
      parameters={[
        { name: "state", type: props.stateRefkey },
        { name: "event", type: props.unionRefkey },
      ]}
      returnType={props.stateRefkey}
    >
      {`switch (event.type) {\n${cases}\n  }`}
    </ts.FunctionDeclaration>
  );
}

// Emit a TanStack Router route file
export function emitRouteFile(route: RouteDef) {
  const stateRk = efRefkey(route.state);
  const unionRk = efRefkey(route.events);

  const variants = Array.from(route.events.variants.values());
  const variantRks = variants.map(v => ({
    name: String(v.name),
    refkey: refkey(v),
  }));

  const stateName = route.state.name;
  const defaultsName = `${toCamelCase(stateName)}Defaults`;
  const reducerName = `${toCamelCase(stateName)}Reducer`;

  const allProps = Array.from(route.state.properties.values());
  const hasAllDefaults = allProps.every(p => p.optional || hasDefault(p));

  // Extract $param names from the path for useParams destructuring
  const paramNames = (route.path.match(/\$\w+/g) || []).map(p => p.slice(1));

  const filePath = `routes/${route.fileName}.tsx`;

  const jsx = (
    <ts.SourceFile path={filePath}>
      {AUTO_MARKER}{"\n"}
      {`import { createFileRoute } from "@tanstack/react-router";\n`}
      {`import { useReducer } from "react";\n\n`}

      <TspInterface type={route.state} export />{"\n\n"}

      {variants.map((v, i) => (
        <>
          <EventInterface variant={v} refkey={variantRks[i].refkey} />{"\n\n"}
        </>
      ))}

      <EventUnionType
        name={route.events.name!}
        refkey={unionRk}
        variantRefkeys={variantRks}
      />{"\n\n"}

      <DefaultsConst
        stateName={stateName}
        stateRefkey={stateRk}
        stateModel={route.state}
      />{"\n\n"}

      <ReducerFunction
        stateName={stateName}
        stateRefkey={stateRk}
        unionRefkey={unionRk}
        variants={variants}
      />{"\n\n"}

      {MANUAL_MARKER}{"\n\n"}

      {`function ${route.componentName}Page() {\n`}
      {hasAllDefaults
        ? `  const [state, dispatch] = useReducer(${reducerName}, ${defaultsName});\n`
        : `  const [state, dispatch] = useReducer(${reducerName}, {} as ${stateName});\n`
      }
      {paramNames.length > 0
        ? `  const { ${paramNames.join(", ")} } = Route.useParams();\n`
        : ""
      }
      {`\n  // TODO: render\n  return <div>TODO</div>;\n}\n\n`}

      {`export const Route = createFileRoute("${route.path}")({\n`}
      {`  component: ${route.componentName}Page,\n`}
      {`});\n`}
    </ts.SourceFile>
  );

  return { path: route.path, fileName: route.fileName, jsx };
}
