#suppress "experimental-feature" ""
import "./codegen.js";

extern dec param(target: Reflection.Namespace, typeName: valueof string);

namespace Codegen {
  extern fn generateRoutes(ns: Reflection.Namespace): unknown;
}
