import type {
  DecoratorContext,
  Model,
  Program,
  Type,
} from "@typespec/compiler";
import { DecoratorDefStateKeys } from "./lib.js";

export const namespace = "DecoratorDef";

export interface DecoratorDefData {
  shape: "flag" | "value" | "object" | "list" | "exclusive";
  targets: string;
  exclusiveKey?: string;
  exclusiveValue?: string;
  doc?: string;
}

const SHAPE_MAP: Record<number, DecoratorDefData["shape"]> = {
  0: "flag",
  1: "value",
  2: "object",
  3: "list",
  4: "exclusive",
};

const TARGET_MAP: Record<number, string> = {
  0: "Namespace",
  1: "Interface",
  2: "Operation",
  3: "Model",
  4: "ModelProperty",
  5: "Enum",
  6: "EnumMember",
  7: "Scalar",
  8: "Union",
  9: "UnionVariant",
};

export function $decoratorDef(
  context: DecoratorContext,
  target: Model,
  shape: number,
  targets: number[],
  options?: { exclusiveKey?: string; exclusiveValue?: string; doc?: string },
) {
  const data: DecoratorDefData = {
    shape: SHAPE_MAP[shape] ?? "value",
    targets: targets.map(t => TARGET_MAP[t] ?? "Model").join(" | "),
    exclusiveKey: options?.exclusiveKey,
    exclusiveValue: options?.exclusiveValue,
    doc: options?.doc,
  };
  context.program.stateMap(DecoratorDefStateKeys.decoratorDef).set(target, data);
}

export function getDecoratorDef(program: Program, target: Type): DecoratorDefData | undefined {
  return program.stateMap(DecoratorDefStateKeys.decoratorDef).get(target);
}
