// 1-M traversal: /lists/{id}/todos
// List hasMany Todos.
// DB: SELECT * FROM todos WHERE list_id = {id}
// Single join, scoped to parent.
import "../../entity.tsp";

namespace routes.lists.id_.todos {
  namespace query {
    namespace get {}                                   // GET /lists/{id}/todos

    // Multi-join: all comments across all todos in this list (2-hop)
    // DB: SELECT c.* FROM comments c
    //     JOIN todos t ON c.todo_id = t.id
    //     WHERE t.list_id = {id}
    namespace comments {}                              // GET /lists/{id}/todos/comments

    // Multi-join: all unique tags across todos in this list (2-hop through junction)
    // DB: SELECT DISTINCT tg.* FROM tags tg
    //     JOIN todo_tags tt ON tg.id = tt.tag_id
    //     JOIN todos t ON tt.todo_id = t.id
    //     WHERE t.list_id = {id}
    namespace tags {}                                  // GET /lists/{id}/todos/tags
  }
}
