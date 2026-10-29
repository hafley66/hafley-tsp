import { List, refkey, Refkey } from "@alloy-js/core";
import { StructDeclaration, StructField } from "../components/1_declarations/0_StructDeclaration.js";
import { EnumDeclaration, TupleVariant, UnitVariant } from "../components/1_declarations/1_EnumDeclaration.js";
import { Attributes } from "../components/0_primitives/1_Attributes.js";
import type { SerdeContainerConfig } from "../components/0_primitives/2_Serde.js";
import { SourceFile } from "../components/3_files/0_SourceFile.js";
import { mapType, rustIdent, wrapOptional, type RefkeyRegistry } from "./01_type-map.js";
import type { ModelDef, EnumDef, TypeDef, UnionDef } from "./00_types.js";
import type { ModelExtras } from "./04_ops-plan.js";

const MODEL_DERIVES = ["Debug", "Clone", "Serialize", "Deserialize"];
const MODEL_EXTERNAL_USES = ["serde::Deserialize", "serde::Serialize"];
const ENUM_DERIVES = ["Debug", "Clone", "Serialize", "Deserialize", "PartialEq"];

export interface EmittedType {
  name: string;
  refkey: Refkey;
  jsx: any;
}

export function emitModel(model: ModelDef, registry: RefkeyRegistry, rk?: Refkey, extras?: ModelExtras, daemon = false): EmittedType {
  const key = rk ?? refkey();
  const fileExternalUses = [...MODEL_EXTERNAL_USES];

  const fields = model.properties.map(prop => {
    let rt = mapType(prop.type, registry);
    if (prop.optional && prop.type.kind !== "nullable") rt = wrapOptional(rt);
    fileExternalUses.push(...rt.externalUses);
    return { name: prop.name, typeCode: rt.code, attrs: [
      ...(extras?.fieldAttrs.get(prop.name) ?? []),
      ...(daemon && extras?.fieldAttrs.get(prop.name)?.includes("command(flatten)") ? ["serde(flatten)"] : []),
      ...(daemon && extras && prop.cli?.skip ? ["serde(skip)"] : []),
      ...(daemon && extras && (prop.type.kind === "array" || prop.type.kind === "scalar" && prop.type.name === "boolean") ? ["serde(default)"] : []),
    ] };
  });

  const uniqueUses = [...new Set(fileExternalUses)];
  const fileName = toSnakeCase(model.name) + ".rs";

  const jsx = (
    <SourceFile path={fileName} externalUses={uniqueUses}>
      <StructDeclaration
        name={model.name}
        refkey={key}
        derive={[...MODEL_DERIVES, ...(extras?.derives ?? [])]}
        attrs={extras?.attrs}
      >
        <List hardline>
          {fields.map(f => (
            <StructField name={f.name} type={f.typeCode} attrs={f.attrs} />
          ))}
        </List>
      </StructDeclaration>
    </SourceFile>
  );

  return { name: model.name, refkey: key, jsx };
}

export function emitEnum(def: EnumDef, registry: RefkeyRegistry, rk?: Refkey, extras?: ModelExtras): EmittedType {
  const key = rk ?? refkey();
  const fileExternalUses = [...MODEL_EXTERNAL_USES];
  const uniqueUses = [...new Set(fileExternalUses)];
  const fileName = toSnakeCase(def.name) + ".rs";

  const jsx = (
    <SourceFile path={fileName} externalUses={uniqueUses}>
      <EnumDeclaration
        name={def.name}
        refkey={key}
        derive={[...ENUM_DERIVES, ...(extras?.derives ?? [])]}
      >
        <List hardline>
          {def.members.map(m => (
            <UnitVariant name={m.name} />
          ))}
        </List>
      </EnumDeclaration>
    </SourceFile>
  );

  return { name: def.name, refkey: key, jsx };
}

// A TypeSpec name that is no Rust identifier (`slow-ish`) keeps its spelling on the
// wire through serde(rename); every other name is the variant identifier verbatim.
function variantIdent(name: string): { ident: string; attrs: string[] } {
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) return { ident: rustIdent(name), attrs: [] };
  const ident = name.replace(/[^A-Za-z0-9_]/g, "_").replace(/^(?=[0-9])/, "_");
  return { ident, attrs: [`serde(rename = ${JSON.stringify(name)})`] };
}

const UNION_SERDE: { [K in UnionDef["tagging"]["kind"]]: (t: Extract<UnionDef["tagging"], { kind: K }>) => SerdeContainerConfig | undefined } = {
  untagged: () => ({ untagged: true }),
  literals: () => undefined,
  adjacent: t => ({ tag: t.tag, content: t.content }),
  internal: t => ({ tag: t.tag }),
};

// One Rust enum per TypeSpec union; the serde shape is the one @typespec/openapi3 declares (see UnionTagging).
export function emitUnion(def: UnionDef, registry: RefkeyRegistry, rk?: Refkey): EmittedType {
  const key = rk ?? refkey();
  const fileExternalUses = [...MODEL_EXTERNAL_USES];
  const variants = def.variants.map(v => {
    const { ident, attrs } = variantIdent(v.name);
    const rt = v.type && mapType(v.type, registry);
    fileExternalUses.push(...(rt?.externalUses ?? []));
    return { ident, attrs, code: rt?.code };
  });
  const literals = def.tagging.kind === "literals";
  const serde = (UNION_SERDE[def.tagging.kind] as (t: UnionDef["tagging"]) => SerdeContainerConfig | undefined)(def.tagging);
  const camel = variants.every(v => /^[A-Z][A-Za-z0-9]*$/.test(v.ident));

  const jsx = (
    <SourceFile path={toSnakeCase(def.name) + ".rs"} externalUses={[...new Set(fileExternalUses)]}>
      <EnumDeclaration
        name={def.name}
        refkey={key}
        derive={literals ? ENUM_DERIVES : MODEL_DERIVES}
        serde={serde}
        attrs={camel ? undefined : ["allow(non_camel_case_types)"]}
      >
        <List hardline>
          {variants.map(v => (
            <>
              {v.attrs.length ? <><Attributes attrs={v.attrs} />{"\n"}</> : null}
              {v.code === undefined ? <UnitVariant name={v.ident} /> : <TupleVariant name={v.ident} fields={[v.code]} />}
            </>
          ))}
        </List>
      </EnumDeclaration>
    </SourceFile>
  );

  return { name: def.name, refkey: key, jsx };
}

export function emitTypeDef(def: TypeDef, registry: RefkeyRegistry, rk?: Refkey, extras?: ModelExtras, daemon = false): EmittedType {
  if (def.kind === "union") return emitUnion(def, registry, rk);
  return def.kind === "model" ? emitModel(def, registry, rk, extras, daemon) : emitEnum(def, registry, rk, extras);
}

export function toSnakeCase(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();
}
