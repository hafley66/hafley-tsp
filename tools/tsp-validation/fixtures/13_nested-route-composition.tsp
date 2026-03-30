// TEST: namespace merging composes route trees across blocks
// TEST: simulates top-level routes.tsp + nested routes.tsp
// EXPECT: compiles clean, flattenRoutes sees merged tree
#suppress "experimental-feature" ""
import "../lib/route.tsp";
using Route;

// ── "routes.tsp" (top level) ──
namespace routes {
  namespace todos {
    namespace create {}
    namespace read {}

    @param("string")
    namespace id {
      namespace read {}
      namespace update {}
      namespace delete {}
    }
  }
}

// ── "todos/{id}/routes.tsp" (nested, extends tree via namespace merging) ──
namespace routes.todos.id {
  namespace comments {
    namespace create {}
    namespace read {}

    @param("string")
    namespace commentId {
      namespace read {}
      namespace delete {}
    }
  }
}

// flattenRoutes sees the full merged tree
alias AllRoutes = flattenRoutes(routes);

// Spread to verify all entries exist
model FullRouteTable { ...AllRoutes; }
