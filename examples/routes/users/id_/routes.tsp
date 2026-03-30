// Param level: /users/{id}
// query/ and mut/ only. No side/deps.
import "../entity.tsp";

@param("UserId")
namespace routes.users.id_ {
  namespace query {
    namespace get {}                                   // GET /users/{id}  (collapsed)
  }

  namespace mut {
    namespace update {}                                // PUT /users/{id}/update
    namespace delete {}                                // DELETE /users/{id}/delete
  }
}
