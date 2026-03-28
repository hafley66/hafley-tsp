// Walk neutral TypeDef[] through a TargetLang, producing declarations.

import type { TypeDef, PropertyType, FieldDef } from "./0_types.js";
import type { TargetLang, MappedField } from "./1_target.js";

export function mapPropertyType<TType>(type: PropertyType, lang: TargetLang<TType, any>): TType {
  switch (type.kind) {
    case "scalar":
      return lang.scalar(type.name);
    case "array":
      return lang.array(mapPropertyType(type.element, lang));
    case "map":
      return lang.map(
        lang.scalar(type.key.name),
        mapPropertyType(type.value, lang),
      );
    case "model":
      return lang.ref(type.name);
    case "enum":
      return lang.ref(type.name);
  }
}

export function mapField<TType>(field: FieldDef, lang: TargetLang<TType, any>): MappedField<TType> {
  let type = mapPropertyType(field.type, lang);
  if (field.optional) {
    type = lang.optional(type);
  }
  return {
    name: lang.fieldName(field.name),
    type,
    optional: !!field.optional,
    doc: field.doc,
  };
}

export function emitAll<TType, TDecl>(types: TypeDef[], lang: TargetLang<TType, TDecl>): TDecl[] {
  return types.map(t => {
    switch (t.kind) {
      case "model":
        return lang.model(
          lang.typeName(t.name),
          t.fields.map(f => mapField(f, lang)),
          t.doc,
        );
      case "enum":
        return lang.enum(
          lang.typeName(t.name),
          t.members.map(m => ({
            name: lang.memberName(m.name),
            value: m.value,
            doc: m.doc,
          })),
          t.doc,
        );
    }
  });
}
