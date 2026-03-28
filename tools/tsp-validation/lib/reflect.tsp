#suppress "experimental-feature" ""
import "./reflect.js";

// Decorators at global scope (bare $export JS binding)
extern dec timingBefore(target: Reflection.Operation, ref: Reflection.Operation);
extern dec timingAfter(target: Reflection.Operation, ref: Reflection.Operation);
extern dec timingOn(target: Reflection.Operation, ref: Reflection.Operation);

// Functions namespaced (bound via $functions.Reflect)
namespace Reflect {
  extern fn dumpOp(target: Reflection.Operation): unknown;
  extern fn dumpNs(ns: Reflection.Namespace): Reflection.Namespace;
  extern fn mergeModels(a: Reflection.Model, b: Reflection.Model): Reflection.Model;
}
