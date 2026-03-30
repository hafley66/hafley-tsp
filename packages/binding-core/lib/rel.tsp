using TypeSpec.Reflection;

namespace Rel {
  /** M:1 -- FK lives on this model. */
  extern dec belongsTo(target: ModelProperty);

  /** 1:M -- FK lives on the other model. */
  extern dec hasMany(target: ModelProperty);

  /** 1:1 -- FK lives on the other model. */
  extern dec hasOne(target: ModelProperty);

  /** M:M -- junction table. */
  extern dec manyToMany(target: ModelProperty);
}
