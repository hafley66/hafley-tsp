// Root scaffold: imports all route files, produces flat route table
#suppress "experimental-feature" ""
import "../../tools/tsp-validation/lib/route.tsp";

// Orgs
import "./orgs/routes.tsp";
import "./orgs/id_/routes.tsp";
import "./orgs/id_/members/routes.tsp";            // 1-M: org → users

// Users
import "./users/routes.tsp";
import "./users/id_/routes.tsp";
import "./users/id_/todos/routes.tsp";             // 1-M: user → todos
import "./users/id_/comments/routes.tsp";          // 1-M + multi-join: user → comments

// Lists
import "./lists/routes.tsp";
import "./lists/id_/routes.tsp";
import "./lists/id_/todos/routes.tsp";             // 1-M + multi-join: list → todos → comments/tags

// Todos
import "./todos/routes.tsp";
import "./todos/id_/routes.tsp";
import "./todos/id_/comments/routes.tsp";          // 1-M: todo → comments
import "./todos/id_/comments/id_/routes.tsp";
import "./todos/id_/tags/routes.tsp";              // M-M: todo ↔ tags (junction)
import "./todos/id_/tags/id_/routes.tsp";

// Tags
import "./tags/routes.tsp";
import "./tags/id_/routes.tsp";

using Route;

alias AllRoutes = flattenRoutes(routes);
model RouteTable { ...AllRoutes; }
