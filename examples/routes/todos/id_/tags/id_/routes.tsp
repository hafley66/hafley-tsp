// M-M direct access: /todos/{id}/tags/{tagId}
// Addresses a specific junction relationship.
import "../../../entity.tsp";

@param("TagId")
namespace routes.todos.id_.tags.id_ {
  namespace query {
    namespace get {}                                   // GET /todos/{id}/tags/{tagId}
  }

  namespace mut {
    // DELETE on the junction: removes the link, not the tag entity
    namespace delete {}                                // DELETE /todos/{id}/tags/{tagId}
  }
}
