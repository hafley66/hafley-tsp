using TypeSpec.Reflection;

namespace Bind {
  /**
   * Declare a binding between a source model (wire format) and a target model (storage).
   * Properties on the decorated model are mapping rules:
   *   - Tuple of ModelProperty refs = explicit chain (rename, nested access)
   *   - Same-name fields between source/target auto-map
   *   - Backtick dot-path fields on target auto-resolve by splitting on '.'
   *
   * @param source The wire-format model (e.g. GhPullRequest)
   * @param target The storage model (e.g. PullRequest)
   *
   * @example
   * ```typespec
   * @Bind.from(GhPullRequest, PullRequest)
   * model PrBinding {
   *   gh_node_id: [GhPullRequest.id];
   *   is_draft:   [GhPullRequest.isDraft];
   * }
   * ```
   */
  extern dec from(target: Model, source: Model, targetModel: Model);
}
