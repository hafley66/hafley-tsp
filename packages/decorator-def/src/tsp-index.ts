import { $decoratorDef } from "./decorators.js";
import { $valueName, $requires, $conflictsWith, $valueDelimiter, $positional, $skip, $requiredOneOf, $rootArgs, $argsConflictsWithSubcommands, $afterHelp } from "./clap.js";

export { $lib } from "./lib.js";

export const $decorators = {
  "DecoratorDef": {
    decoratorDef: $decoratorDef,
  },
  "Clap": { valueName: $valueName, requires: $requires, conflictsWith: $conflictsWith, valueDelimiter: $valueDelimiter, positional: $positional, skip: $skip, requiredOneOf: $requiredOneOf, rootArgs: $rootArgs, argsConflictsWithSubcommands: $argsConflictsWithSubcommands, afterHelp: $afterHelp },
};
