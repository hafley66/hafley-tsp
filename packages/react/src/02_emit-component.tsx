// Emits a single React component .tsx file with auto/manual zones.
// Uses @typespec/emitter-framework for type generation.
// Adds component scaffolding: reducer shell, useReducer wiring, auto/manual markers.

import { List, refkey, type Refkey, type Children } from "@alloy-js/core";

// emitter-framework prefixes its refkeys with this symbol so they don't
// collide with bare refkey() calls. We need the same prefix so our
// references resolve against TspInterface's declarations.
const EF_PREFIX = Symbol.for("emitter-framework:typescript");
function efRefkey(...args: unknown[]): Refkey {
  return refkey(EF_PREFIX, ...args);
}
import * as ts from "@alloy-js/typescript";
import {
  InterfaceDeclaration as TspInterface,
  InterfaceMember as TspInterfaceMember,
  TypeExpression,
} from "@typespec/emitter-framework/typescript";
import type { Model, Union, ModelProperty, UnionVariant } from "@typespec/compiler";
import type { ComponentDef } from "./00_types.js";

const AUTO_MARKER = "// --- AUTO-GENERATED (do not edit above this line) ---";
const MANUAL_MARKER = "// --- MANUAL (edit below this line) ---";

function toCamelCase(name: string): string {
  return name.charAt(0).toLowerCase() + name.slice(1);
}

// Check if a ModelProperty has a default value
function hasDefault(prop: ModelProperty): boolean {
  return prop.defaultValue !== undefined;
}

// Get the default value as a JS literal string
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

// Emit event interface with type discriminant
function EventInterface(props: { variant: UnionVariant; refkey: Refkey }) {
  const variantType = props.variant.type;
  // Use the Model's name for the interface (e.g. "Increment"),
  // and the union variant key for the discriminant (e.g. "increment").
  const name = variantType.kind === "Model" ? variantType.name : String(props.variant.name);
  const discriminant = String(props.variant.name);

  // If the variant type is a Model, emit its properties alongside the discriminant
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

// Emit the event union type alias
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

// Emit defaults constant from model properties
function DefaultsConst(props: {
  stateName: string;
  stateRefkey: Refkey;
  stateModel: Model;
}) {
  const allProps = Array.from(props.stateModel.properties.values());
  const propsWithDefaults = allProps.filter(hasDefault);

  // Only emit if all required (non-optional) fields have defaults
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

// Emit reducer function with exhaustive switch shell
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

// Emit the full component file
export function emitReactComponent(def: ComponentDef) {
  // Use emitter-framework's prefixed refkeys so our references resolve
  // against TspInterface/TspTypeDeclaration declarations.
  const stateRk = efRefkey(def.state);
  const unionRk = efRefkey(def.events);

  const variants = Array.from(def.events.variants.values());
  const variantRks = variants.map(v => ({
    name: String(v.name),
    refkey: refkey(v),
  }));

  const stateName = def.state.name;
  const defaultsName = `${toCamelCase(stateName)}Defaults`;
  const reducerName = `${toCamelCase(stateName)}Reducer`;

  const allProps = Array.from(def.state.properties.values());
  const hasAllDefaults = allProps.every(p => p.optional || hasDefault(p));

  const fileName = `${def.name}.tsx`;

  const jsx = (
    <ts.SourceFile path={fileName}>
      {AUTO_MARKER}{"\n\n"}

      <TspInterface type={def.state} export />{"\n\n"}

      {variants.map((v, i) => (
        <>
          <EventInterface variant={v} refkey={variantRks[i].refkey} />{"\n\n"}
        </>
      ))}

      <EventUnionType
        name={def.events.name!}
        refkey={unionRk}
        variantRefkeys={variantRks}
      />{"\n\n"}

      <DefaultsConst
        stateName={stateName}
        stateRefkey={stateRk}
        stateModel={def.state}
      />{"\n\n"}

      <ReducerFunction
        stateName={stateName}
        stateRefkey={stateRk}
        unionRefkey={unionRk}
        variants={variants}
      />{"\n\n"}

      {MANUAL_MARKER}{"\n\n"}

      {`import { useReducer } from "react";\n\n`}

      {`export function ${def.name}() {\n`}
      {hasAllDefaults
        ? `  const [state, dispatch] = useReducer(${reducerName}, ${defaultsName});\n`
        : `  const [state, dispatch] = useReducer(${reducerName}, {} as ${stateName});\n`
      }
      {`\n  // TODO: render\n  return <div>TODO</div>;\n}\n`}
    </ts.SourceFile>
  );

  return { name: def.name, jsx };
}
