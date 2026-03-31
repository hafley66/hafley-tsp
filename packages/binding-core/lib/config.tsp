using TypeSpec.Reflection;

namespace Config {
  /** Marks a model as a config source (generates serde struct + TOML loader). */
  extern dec source(target: Model);

  /** Maps a field to an environment variable override. */
  extern dec envVar(target: ModelProperty, name: valueof string);

  /** Marks a field as secret (excluded from Display, debug logging). */
  extern dec secret(target: ModelProperty);

  /** Config file path pattern (e.g. "~/.config/ghcacher/config.toml"). */
  extern dec path(target: Model, pattern: valueof string);
}
