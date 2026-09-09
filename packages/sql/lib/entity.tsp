using TypeSpec.Reflection;

namespace Entity {
  /** Intern exact string values in a dictionary owned by this scalar type. */
  extern dec intern(target: Scalar);
  /** Mark a field as the primary key. */
  extern dec pk(target: ModelProperty);
  /** Composite unique constraint and upsert conflict key. */
  extern dec unique(target: ModelProperty, ...fields: ModelProperty[]);
  /** Mark a field as manually filled. */
  extern dec manual(target: ModelProperty);
  /** Declare a composite index on this field plus additional fields. */
  extern dec index(target: ModelProperty, ...fields: ModelProperty[]);
  /** SQL default literal or expression, passed through verbatim. */
  extern dec default(target: ModelProperty, value: valueof string);
}
