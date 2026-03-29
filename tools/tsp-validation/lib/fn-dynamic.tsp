#suppress "experimental-feature" ""
import "./fn-dynamic.js";

namespace FnDynamic {
  extern fn registerFn(name: valueof string): unknown;
  extern fn callDynamic(name: valueof string, arg: valueof string): unknown;
  extern fn createAndCall(name: valueof string): unknown;
}
