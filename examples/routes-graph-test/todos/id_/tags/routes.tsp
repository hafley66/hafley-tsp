// M:M junction: Todo ↔ Tag via todo_tags
// DB: SELECT t.* FROM tags t JOIN todo_tags tt ON t.id = tt.tag_id WHERE tt.todo_id = ?
import "./entity.tsp";
namespace routes.todos.id_.tags {
  namespace query { namespace get {} }               // GET /todos/{id}/tags
  namespace mut {
    namespace link {}                                // POST /todos/{id}/tags/link
    namespace unlink {}                              // POST /todos/{id}/tags/unlink
  }
}
