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

export function $decoratorDef(
  context: DecoratorContext,
  target: Model,
  shape: number,
  targets: string,
  options?: { exclusiveKey?: string; exclusiveValue?: string; doc?: string },
) {
  const data: DecoratorDefData = {
    shape: SHAPE_MAP[shape] ?? "value",
    targets,
    exclusiveKey: options?.exclusiveKey,
    exclusiveValue: options?.exclusiveValue,
    doc: options?.doc,
  };
  context.program.stateMap(DecoratorDefStateKeys.decoratorDef).set(target, data);
}

export function getDecoratorDef(program: Program, target: Type): DecoratorDefData | undefined {
  return program.stateMap(DecoratorDefStateKeys.decoratorDef).get(target);
}
