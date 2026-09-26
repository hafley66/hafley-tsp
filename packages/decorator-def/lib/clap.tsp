namespace Clap;

extern dec valueName(target: ModelProperty, name: string);
extern dec requires(target: ModelProperty, name: string);
extern dec conflictsWith(target: ModelProperty, names: string[]);
extern dec valueDelimiter(target: ModelProperty, delimiter: string);
extern dec positional(target: ModelProperty);
extern dec skip(target: ModelProperty);
extern dec requiredOneOf(target: Model | Operation, names: string[]);
extern dec rootArgs(target: Namespace, args: Model);
extern dec argsConflictsWithSubcommands(target: Namespace);
extern dec afterHelp(target: Namespace | Operation, text: string);
