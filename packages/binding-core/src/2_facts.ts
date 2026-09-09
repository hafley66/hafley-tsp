import type { ModelProperty, Type } from "@typespec/compiler";

export {
  snakeCase,
  resolveRelTarget,
  resolvedFields,
  resolveScalarName,
  resolveFieldType,
  isEntityModel,
  collectModels,
  type ResolvedField,
} from "@hafley/typespec-sql";

/** Walk a Tuple type to extract `Model.property` binding-chain strings. */
export function extractChain(type: Type): string[] {
  if (type.kind !== "Tuple") return [];
  return type.values.map((value) => {
    if (value.kind === "ModelProperty") {
      const property = value as ModelProperty;
      return `${property.model?.name ?? "?"}.${property.name}`;
    }
    return String(value);
  });
}
