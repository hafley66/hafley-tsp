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

  /**
   * Default value for this column. String is passed through verbatim to SQL.
   * Use for literals ("main", "0") or expressions ("(strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))").
   *
   * @example
   * ```typespec
   * @Entity.default("main")
   * default_branch: string;
   *
   * @Entity.default("0")
   * draft: boolean;
   *
   * @Entity.default("(strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))")
   * created_at: string;
   * ```
   */
  extern dec default(target: ModelProperty, value: valueof string);
}
