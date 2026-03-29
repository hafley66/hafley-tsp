// TEST: can function return values be passed to other functions?
// EXPECT: exploring fn composition
#suppress "experimental-feature" ""
import "../lib/fn-return.tsp";
using FnReturn;

namespace Test {
  // Basic: does makeModel work standalone?
  alias M1 = makeModel("hello");
  model UsesM1 { ...M1; }

  // fn → fn composition works: resolved Model passes through with .kind and .properties
  alias M2 = addField(M1, "world");
  model UsesM2 { ...M2; }

  // Can a function return a JS function? What does TSP do with it?
  alias Curried = curry("test");
  // If Curried is a function, can we call it?
  // alias Applied = Curried("second");  // almost certainly won't work syntactically
}
