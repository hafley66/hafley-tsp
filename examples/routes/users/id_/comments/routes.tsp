// Multi-join traversal: /users/{id}/comments
// User hasMany Comments (direct 1-M).
// But also: "comments on todos owned by this user" is a 2-hop join:
//   users → todos (owner_id) → comments (todo_id)
//
// The direct relation gives: comments authored by this user.
// A named query can express the multi-hop:
import "../../entity.tsp";

namespace routes.users.id_.comments {
  namespace query {
    // Direct 1-M: comments this user wrote
    // DB: SELECT * FROM comments WHERE author_id = {id}
    namespace get {}                                   // GET /users/{id}/comments

    // Multi-join: comments on this user's todos (2-hop)
    // DB: SELECT c.* FROM comments c
    //     JOIN todos t ON c.todo_id = t.id
    //     WHERE t.owner_id = {id}
    namespace onMyTodos {}                             // GET /users/{id}/comments/onMyTodos
  }
}
