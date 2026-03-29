#suppress "experimental-feature" ""
import "./fn-return.js";

namespace FnReturn {
  // fn that creates a model with one field
  extern fn makeModel(fieldName: valueof string): unknown;

  // fn that takes a model and adds a field to it
  extern fn addField(base: unknown, fieldName: valueof string): unknown;

  // fn that returns... a function? or something callable?
  extern fn curry(fieldName: valueof string): unknown;
}
