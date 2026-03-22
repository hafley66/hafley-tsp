// Shared emitter components used by both component and route emitters.

import { List, refkey, type Refkey } from "@alloy-js/core";
import * as ts from "@alloy-js/typescript";
import {
  InterfaceDeclaration as TspInterface,
  InterfaceMember as TspInterfaceMember,
} from "@typespec/emitter-framework/typescript";
import type { Model, ModelProperty, UnionVariant } from "@typespec/compiler";

// emitter-framework prefixes its refkeys with this symbol so they don't
// collide with bare refkey() calls. We need the same prefix so our
// references resolve against TspInterface's declarations.
const EF_PREFIX = Symbol.for("emitter-framework:typescript");
export function efRefkey(...args: unknown[]): Refkey {
  return refkey(EF_PREFIX, ...args);
}

export function toCamelCase(name: string): string {
  return name.charAt(0).toLowerCase() + name.slice(1);
}

export function hasDefault(prop: ModelProperty): boolean {
  return prop.defaultValue !== undefined;
}

export function defaultToString(prop: ModelProperty): string | null {
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
export function EventInterface(props: { variant: UnionVariant; refkey: Refkey }) {
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

// Emit the event union type alias
export function EventUnionType(props: {
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
export function DefaultsConst(props: {
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

// Emit reducer function with exhaustive switch shell
export function ReducerFunction(props: {
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

// Emit the full auto zone content: state interface, event types, defaults, reducer
export function AutoStateBlock(props: {
  state: Model;
  events: import("@typespec/compiler").Union;
}) {
  const stateRk = efRefkey(props.state);
  const unionRk = efRefkey(props.events);
  const variants = Array.from(props.events.variants.values());
  const variantRks = variants.map(v => ({
    name: String(v.name),
    refkey: refkey(v),
  }));
  const stateName = props.state.name;

  return (
    <>
      <TspInterface type={props.state} export />{"\n\n"}

      {variants.map((v, i) => (
        <>
          <EventInterface variant={v} refkey={variantRks[i].refkey} />{"\n\n"}
        </>
      ))}

      <EventUnionType
        name={props.events.name!}
        refkey={unionRk}
        variantRefkeys={variantRks}
      />{"\n\n"}

      <DefaultsConst
        stateName={stateName}
        stateRefkey={stateRk}
        stateModel={props.state}
      />{"\n\n"}

      <ReducerFunction
        stateName={stateName}
        stateRefkey={stateRk}
        unionRefkey={unionRk}
        variants={variants}
      />
    </>
  );
}
