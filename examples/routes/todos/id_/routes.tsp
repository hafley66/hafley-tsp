// Param level: /todos/{id}
// Single-resource ops. No side/deps.
import "../entity.tsp";

@param("TodoId")
namespace routes.todos.id_ {
  namespace query {
    namespace get {}                                   // GET /todos/{id}  (collapsed)
  }

  namespace mut {
    namespace update {}                                // PUT /todos/{id}/update
    namespace delete {}                                // DELETE /todos/{id}/delete
  }
}
