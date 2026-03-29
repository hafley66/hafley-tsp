// TEST: can functions receive string literal values?
// TEST: what is ctx shape during function callback?
// EXPECT: compiles clean, logs template + ctx info
#suppress "experimental-feature" ""
import "../lib/route.tsp";
using Route;

namespace Routes {
  // Simple path with one param
  alias UserRoute = path("/users/{userId}");

  // Path with multiple params
  alias OrderItemRoute = path("/orders/{orderId}/items/{itemId}");

  // Path with query and hash segments
  alias SearchRoute = path("/search/{category}?q={query}&page={page}#results");

  // Can the returned model be used as a type?
  model UserRouteInfo {
    params: UserRoute;
  }

  // Can it be spread?
  model UserParams {
    ...UserRoute;
    extra: string;
  }

  // Can it be used in an op signature?
  op getUser(...UserRoute): string;

  // Can we use the multi-param one?
  op getOrderItem(...OrderItemRoute): string;
}
