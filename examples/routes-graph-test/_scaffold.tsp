#suppress "experimental-feature" ""
import "../../tools/tsp-validation/lib/route.tsp";
import "./shared/graph.tsp";

import "./orgs/routes.tsp";
import "./orgs/id_/routes.tsp";
import "./orgs/id_/members/routes.tsp";

import "./users/routes.tsp";
import "./users/id_/routes.tsp";
import "./users/id_/todos/routes.tsp";

import "./todos/routes.tsp";
import "./todos/id_/routes.tsp";
import "./todos/id_/tags/routes.tsp";
import "./todos/id_/tags/id_/routes.tsp";

using Route;
alias AllRoutes = flattenRoutes(routes);
// EntityGraph is emitted via $onValidate in graph.js (runs after all types checked)
