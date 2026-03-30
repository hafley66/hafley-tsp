// Entity root: /users
// query/, mut/, side/ live here. This is the collection level.
import "./entity.tsp";

namespace routes.users {
  namespace query {
    namespace me {}                                    // GET /users/me
    namespace get {}                                   // GET /users  (collapsed)
  }

  namespace mut {
    namespace create {}                                // POST /users/create
    namespace update {}                                // PUT /users/update
    namespace delete {}                                // DELETE /users/delete
  }
}
