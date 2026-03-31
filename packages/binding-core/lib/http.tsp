using TypeSpec.Reflection;

namespace Http {
  /** Marks a model as an HTTP router (generates axum Router). */
  extern dec router(target: Model);

  /** GET route. */
  extern dec get(target: ModelProperty, path: valueof string);

  /** POST route. */
  extern dec post(target: ModelProperty, path: valueof string);

  /** PUT route. */
  extern dec put(target: ModelProperty, path: valueof string);

  /** DELETE route. */
  extern dec httpDelete(target: ModelProperty, path: valueof string);

  /** References the config model used as axum State. */
  extern dec state(target: Model, config: Model);
}
