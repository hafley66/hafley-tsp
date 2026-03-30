// 1-M traversal: /users/{id}/todos
// User hasMany Todos. Exposes "all todos owned by this user."
// DB: SELECT * FROM todos WHERE owner_id = {id}
// Single join, scoped to parent.
import "../../entity.tsp";

namespace routes.users.id_.todos {
  namespace query {
    namespace get {}                                   // GET /users/{id}/todos
    namespace overdue {}                               // GET /users/{id}/todos/overdue
  }
}
