using TypeSpec.Reflection;

namespace Entity {
  /**
   * Mark a field as the primary key. Auto-increment integer in SQLite.
   */
  extern dec pk(target: ModelProperty);

  /**
   * Composite unique constraint. Also used as the ON CONFLICT key for upserts.
   * Pass fully qualified model property refs.
   *
   * @example
   * ```typespec
   * model Branch {
   *   @Entity.pk id: integer;
   *   @Rel.belongsTo repo: Repo;
   *   @Entity.unique(Branch.repo, Branch.name)
   *   name: string;
   * }
   * ```
   */
  extern dec unique(target: ModelProperty, ...fields: ModelProperty[]);

  /**
   * Mark a field as manually filled. Emitters skip this field in
   * auto-generated parse/bind code and leave a placeholder.
   */
  extern dec manual(target: ModelProperty);

  /**
   * Declare a composite index on this field plus additional fields.
   */
  extern dec index(target: ModelProperty, ...fields: ModelProperty[]);
}
