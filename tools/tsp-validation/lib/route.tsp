#suppress "experimental-feature" ""
import "./route.js";

extern dec param(target: Reflection.Namespace, typeName: valueof string);

namespace Route {
  extern fn path(template: valueof string): unknown;
  extern fn flattenRoutes(ns: Reflection.Namespace): unknown;
}
