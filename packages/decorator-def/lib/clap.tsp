using TypeSpec.Reflection;

namespace Clap;

extern dec valueName(target: ModelProperty, name: valueof string);
extern dec requires(target: ModelProperty, name: valueof string);
extern dec requiresAll(target: ModelProperty, names: valueof string[]);
extern dec conflictsWith(target: ModelProperty, names: valueof string[]);
extern dec valueDelimiter(target: ModelProperty, delimiter: valueof string);
extern dec positional(target: ModelProperty);
extern dec skip(target: ModelProperty);
extern dec requiredOneOf(target: Model | Operation, names: valueof string[], groupName?: valueof string);
extern dec rootArgs(target: Namespace, args: Model);
extern dec argsConflictsWithSubcommands(target: Namespace);
extern dec afterHelp(target: Namespace | Operation, text: valueof string);
