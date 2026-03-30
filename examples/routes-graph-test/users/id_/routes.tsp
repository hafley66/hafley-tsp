import "../entity.tsp";
@param("UserId")
namespace routes.users.id_ {
  namespace query {
    namespace get {}                                 // GET /users/{id}
    namespace org {}                                 // GET /users/{id}/org  ← M:1 back-edge
  }
}
