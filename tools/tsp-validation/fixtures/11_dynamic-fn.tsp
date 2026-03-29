// TEST: dynamic function creation and invocation at compile time
// EXPECT: register a fn, call it by name, get typed result
#suppress "experimental-feature" ""
import "../lib/fn-dynamic.tsp";
using FnDynamic;

namespace Test {
  // 1. Create and immediately call a dynamic fn
  alias DirectResult = createAndCall("myBuilder");
  model UsesDirectResult { ...DirectResult; }

  // 2. Register a fn, then call it by name through the registry
  alias _reg = registerFn("greeter");
  alias GreeterResult = callDynamic("greeter", "greeting");
  model UsesGreeterResult { ...GreeterResult; }

  // 3. Register another, call both
  alias _reg2 = registerFn("formatter");
  alias FormatterResult = callDynamic("formatter", "formatted");
  model UsesFormatterResult { ...FormatterResult; }

  // 4. Can we call the runtime-registered fn directly from TSP syntax?
  //    greeter was added to FnDynamic.functionDeclarations
  // alias DirectCall = FnDynamic.greeter("direct");
  // ^ FAILS: "Namespace FnDynamic doesn't have member greeter"
  //   Name resolution happens before fn execution (parse time vs runtime)
  //   Runtime-registered fns only callable via ctx.callFunction from JS
}
