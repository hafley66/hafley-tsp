using TypeSpec.Reflection;

namespace Cli {
  /** Marks a model as a CLI command (top-level). */
  extern dec command(target: Model);

  /** Marks a model as a subcommand of a parent command. */
  extern dec subcommand(target: Model, parent: Model);

  /** Marks a field as a CLI flag (--flag-name). */
  extern dec cliFlag(target: ModelProperty);

  /** Marks a field as a positional argument at given position. */
  extern dec cliArg(target: ModelProperty, position: valueof integer);

  /** Short flag alias (-f). */
  extern dec short(target: ModelProperty, char: valueof string);

  /** Help text for a command or flag/arg. */
  extern dec about(target: Model | ModelProperty, text: valueof string);
}
