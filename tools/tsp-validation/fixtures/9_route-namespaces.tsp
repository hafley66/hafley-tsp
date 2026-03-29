// TEST: namespace tree flattened into typed route model
// TEST: @param marks dynamic segments, CRUD names infer HTTP methods
// TEST: read collapses to parent path
// EXPECT: compiles clean, logs route table
#suppress "experimental-feature" ""
import "../lib/route.tsp";
using Route;

namespace routes {
  namespace users {
    namespace create {}
    namespace read {}
    namespace delete {}
    namespace update {}
    namespace updatePatch {}

    @param("string")
    namespace id {
      namespace read {}
      namespace update {}
      namespace delete {}
    }
  }
}

alias AllRoutes = flattenRoutes(routes);

// Verify the result spreads into a model
model AppRoutes { ...AllRoutes; }
