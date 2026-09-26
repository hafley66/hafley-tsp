import type { DecoratorContext, Model, ModelProperty, Namespace, Operation, Program } from "@typespec/compiler";
import { DecoratorDefStateKeys } from "./lib.js";

export interface ClapArg {
  valueName?: string;
  requires?: string;
  requiresAll?: string[];
  conflictsWith?: string[];
  valueDelimiter?: string;
  positional?: boolean;
  skip?: boolean;
}

export interface ClapModel {
  requiredOneOf?: string[];
}

export interface ClapRoot {
  args?: Model;
  argsConflictsWithSubcommands?: boolean;
  afterHelp?: string;
}

type ClapValue = ClapArg & ClapModel & ClapRoot;

function put(context: DecoratorContext, target: ModelProperty | Model | Namespace | Operation, value: ClapValue) {
  const state = context.program.stateMap(DecoratorDefStateKeys.clap);
  state.set(target, { ...(state.get(target) as ClapValue | undefined), ...value });
}

export const $valueName = (c: DecoratorContext, t: ModelProperty, name: string) => put(c, t, { valueName: name });
export const $requires = (c: DecoratorContext, t: ModelProperty, name: string) => put(c, t, { requires: name });
export const $requiresAll = (c: DecoratorContext, t: ModelProperty, names: string[]) => put(c, t, { requiresAll: names });
export const $conflictsWith = (c: DecoratorContext, t: ModelProperty, names: string[]) => put(c, t, { conflictsWith: names });
export const $valueDelimiter = (c: DecoratorContext, t: ModelProperty, delimiter: string) => put(c, t, { valueDelimiter: delimiter });
export const $positional = (c: DecoratorContext, t: ModelProperty) => put(c, t, { positional: true });
export const $skip = (c: DecoratorContext, t: ModelProperty) => put(c, t, { skip: true });
export const $requiredOneOf = (c: DecoratorContext, t: Model | Operation, names: string[]) => put(c, t, { requiredOneOf: names });
export const $rootArgs = (c: DecoratorContext, t: Namespace, args: Model) => put(c, t, { args });
export const $argsConflictsWithSubcommands = (c: DecoratorContext, t: Namespace) => put(c, t, { argsConflictsWithSubcommands: true });
export const $afterHelp = (c: DecoratorContext, t: Namespace | Operation, afterHelp: string) => put(c, t, { afterHelp });

export function getClapArg(program: Program, target: ModelProperty): ClapArg | undefined {
  return program.stateMap(DecoratorDefStateKeys.clap).get(target);
}
export function getClapModel(program: Program, target: Model): ClapModel | undefined {
  return program.stateMap(DecoratorDefStateKeys.clap).get(target);
}
export function getClapRoot(program: Program, target: Namespace): ClapRoot | undefined {
  return program.stateMap(DecoratorDefStateKeys.clap).get(target);
}
export function getClapOperation(program: Program, target: Operation): { afterHelp?: string; requiredOneOf?: string[] } | undefined {
  return program.stateMap(DecoratorDefStateKeys.clap).get(target);
}
