import { $decoratorDef } from "./decorators.js";
import { $valueName, $requires, $requiresAll, $conflictsWith, $valueDelimiter, $positional, $skip, $hidden, $global, $requiredOneOf, $rootArgs, $argsConflictsWithSubcommands, $afterHelp } from "./clap.js";
import { $daemon, $onValidate } from "./daemon.js";

export { $lib } from "./lib.js";
export { $onValidate };

export const $decorators = {
  "DecoratorDef": {
    decoratorDef: $decoratorDef,
  },
  "Clap": { valueName: $valueName, requires: $requires, requiresAll: $requiresAll, conflictsWith: $conflictsWith, valueDelimiter: $valueDelimiter, positional: $positional, skip: $skip, hidden: $hidden, global: $global, requiredOneOf: $requiredOneOf, rootArgs: $rootArgs, argsConflictsWithSubcommands: $argsConflictsWithSubcommands, afterHelp: $afterHelp },
  "Daemon": { daemon: $daemon },
};
