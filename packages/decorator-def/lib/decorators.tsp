using TypeSpec.Reflection;

namespace DecoratorDef;

/** How state is stored for this decorator */
enum Shape {
  flag,
  value,
  object,
  list,
  exclusive,
}

/** TypeSpec node types a decorator can target */
enum Target {
  Namespace,
  Interface,
  Operation,
  Model,
  ModelProperty,
  Enum,
  EnumMember,
  Scalar,
  Union,
  UnionVariant,
}

/**
 * Mark a model as a decorator definition.
 * The model's properties become the decorator's parameters.
 *
 * @param shape How the decorator stores state.
 * @param targets Which TypeSpec node types this decorator applies to.
 *
 * @example
 * ```typespec
 * @decoratorDef(Shape.value, #[Target.Namespace, Target.Interface])
 * model channel {
 *   address: string;
 * }
 * ```
 *
 * @example Flag (no params)
 * ```typespec
 * @decoratorDef(Shape.flag, #[Target.ModelProperty])
 * model payload {}
 * ```
 *
 * @example Exclusive pair
 * ```typespec
 * @decoratorDef(Shape.exclusive, #[Target.Operation], #{ exclusiveKey: "direction", exclusiveValue: "send" })
 * model send {}
 * ```
 */
extern dec decoratorDef(
  target: Model,
  shape: valueof Shape,
  targets: valueof Target[],
  options?: valueof DecoratorDefOptions
);

model DecoratorDefOptions {
  /** For exclusive shape: the shared state key name */
  exclusiveKey?: string;

  /** For exclusive shape: the value this decorator stores */
  exclusiveValue?: string;

  /** Documentation string for the generated decorator */
  doc?: string;
}
