using TypeSpec.Reflection;

namespace Rel {
  extern dec belongsTo(target: ModelProperty);
  extern dec hasMany(target: ModelProperty);
  extern dec hasOne(target: ModelProperty);
  extern dec manyToMany(target: ModelProperty);
}
