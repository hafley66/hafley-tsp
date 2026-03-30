using TypeSpec.Reflection;

namespace Source {
  /** This source model comes from a GraphQL query. */
  extern dec graphql(target: Model);

  /** This source model comes from a REST endpoint. */
  extern dec rest(target: Model, path: valueof string);

  /** REST endpoint uses pagination. */
  extern dec paginated(target: Model);

  /** This entity arrives nested inside a parent entity's API response.
   *  Path is the JSON traversal from parent, e.g. "reviews.nodes". */
  extern dec nested(target: Model, parent: Model, path: valueof string);

  /** Default poll interval in seconds for this source. */
  extern dec pollInterval(target: Model, seconds: valueof integer);
}
