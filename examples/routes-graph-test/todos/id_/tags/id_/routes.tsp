import "../entity.tsp";
@param("TagId")
namespace routes.todos.id_.tags.id_ {
  namespace query { namespace get {} }               // GET /todos/{id}/tags/{tagId}
  namespace mut { namespace delete {} }              // DELETE /todos/{id}/tags/{tagId}
}
