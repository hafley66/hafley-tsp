// Param level: /todos/{id}/comments/{commentId}
import "../entity.tsp";

@param("CommentId")
namespace routes.todos.id_.comments.id_ {
  namespace query {
    namespace get {}                                   // GET /todos/{id}/comments/{commentId}  (collapsed)
  }

  namespace mut {
    namespace update {}                                // PUT /todos/{id}/comments/{commentId}/update
    namespace delete {}                                // DELETE /todos/{id}/comments/{commentId}/delete
  }
}
