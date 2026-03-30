// TEST: fn-created model properties are INVISIBLE to static member access
// TEST: but fn results CAN be passed to other fns and consumed by emitters
// EXPECT: compiles clean (no member access attempted)
#suppress "experimental-feature" ""
import "../lib/route.tsp";
using Route;

namespace routes {
  namespace todos {
    namespace read {}
    @param("string") namespace id {
      namespace read {}
    }
  }
}

// fn creates a real model at runtime -- emitters can walk it
alias AllRoutes = flattenRoutes(routes);

// Spread compiles but copies nothing (spread of unknown/Reflection.Model is no-op)
model RouteTable { ...AllRoutes; }

// KNOWN LIMITATION: these do NOT work:
// alias X = AllRoutes.`/todos`;        -- "has no members" (unknown return)
// alias X = AllRoutes.`/todos`;        -- "doesn't have member" (Reflection.Model return)
// model M { ...AllRoutes; } alias X = M.`/todos`;  -- spread copies nothing
