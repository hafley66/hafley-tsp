import { List, refkey, Refkey } from "@alloy-js/core";
import { StructDeclaration, StructField } from "../components/1_StructDeclaration.js";
import { EnumDeclaration, UnitVariant } from "../components/2_EnumDeclaration.js";
import { SourceFile } from "../components/5_SourceFile.js";
import { mapType, wrapOptional, type RefkeyRegistry } from "./1_type-map.js";
import type { ModelDef, EnumDef, TypeDef } from "./0_types.js";

const MODEL_DERIVES = ["Debug", "Clone", "Serialize", "Deserialize"];
const MODEL_EXTERNAL_USES = ["serde::Deserialize", "serde::Serialize"];
const ENUM_DERIVES = ["Debug", "Clone", "Serialize", "Deserialize", "PartialEq"];

export interface EmittedType {
  name: string;
  refkey: Refkey;
  jsx: any;
}

export function emitModel(model: ModelDef, registry: RefkeyRegistry, rk?: Refkey): EmittedType {
  const key = rk ?? refkey();
  const fileExternalUses = [...MODEL_EXTERNAL_USES];

  const fields = model.properties.map(prop => {
    let rt = mapType(prop.type, registry);
    if (prop.optional) rt = wrapOptional(rt);
    fileExternalUses.push(...rt.externalUses);
    return { name: prop.name, typeCode: rt.code };
  });

  const uniqueUses = [...new Set(fileExternalUses)];
  const fileName = toSnakeCase(model.name) + ".rs";

  const jsx = (
    <SourceFile path={fileName} externalUses={uniqueUses}>
      <StructDeclaration
        name={model.name}
        refkey={key}
        pub
        derive={MODEL_DERIVES}
      >
        <List hardline>
          {fields.map(f => (
            <StructField name={f.name} type={f.typeCode} pub />
          ))}
        </List>
      </StructDeclaration>
    </SourceFile>
  );

  return { name: model.name, refkey: key, jsx };
}

export function emitEnum(def: EnumDef, registry: RefkeyRegistry, rk?: Refkey): EmittedType {
  const key = rk ?? refkey();
  const fileExternalUses = [...MODEL_EXTERNAL_USES];
  const uniqueUses = [...new Set(fileExternalUses)];
  const fileName = toSnakeCase(def.name) + ".rs";

  const jsx = (
    <SourceFile path={fileName} externalUses={uniqueUses}>
      <EnumDeclaration
        name={def.name}
        refkey={key}
        pub
        derive={ENUM_DERIVES}
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

export function emitTypeDef(def: TypeDef, registry: RefkeyRegistry, rk?: Refkey): EmittedType {
  return def.kind === "model" ? emitModel(def, registry, rk) : emitEnum(def, registry, rk);
}

export function toSnakeCase(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();
}
