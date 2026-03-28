// TEST: function-computed types work via alias indirection
// TEST: alias result usable with `is`, spread, op params
// EXPECT: compiles clean
#suppress "experimental-feature" ""
import "../lib/reflect.tsp";
using Reflect;

namespace Test {
  model A { x: string; }
  model B { z: boolean; }

  // alias works
  alias Merged = mergeModels(A, B);

  // alias used with `is`
  model C is Merged;

  // alias used with spread
  model D {
    ...Merged;
    extra: int32;
  }

  // alias used in op signature
  op doThing(input: Merged): Merged;
}
