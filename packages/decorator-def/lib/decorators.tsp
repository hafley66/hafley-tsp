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

/**
 * Mark a model as a decorator definition.
 * The model's properties become the decorator's parameters.
 *
 * @param shape How the decorator stores state.
 * @param targets What TypeSpec nodes this decorator can be applied to.
 *
 * @example
 * ```typespec
 * @decoratorDef(Shape.value, "Namespace | Interface")
 * model channel {
 *   address: string;
 * }
 * ```
 *
 * @example Flag (no params)
 * ```typespec
 * @decoratorDef(Shape.flag, "ModelProperty")
 * model payload {}
 * ```
 *
 * @example Exclusive pair
 * ```typespec
 * @decoratorDef(Shape.exclusive, "Operation", #{ exclusiveKey: "direction", exclusiveValue: "send" })
 * model send {}
 * ```
 */
extern dec decoratorDef(
  target: Model,
  shape: valueof Shape,
  targets: valueof string,
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
