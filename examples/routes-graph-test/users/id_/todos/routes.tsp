// 1:M traversal: User.todos → Todo[]
// DB: SELECT * FROM todos WHERE owner_id = ?
import "../../entity.tsp";
namespace routes.users.id_.todos {
  namespace query { namespace get {} }               // GET /users/{id}/todos
}
