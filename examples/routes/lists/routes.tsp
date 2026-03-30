// Entity root: /lists
// Demonstrates: freeform mut actions (archive, duplicate → POST), deps, custom query
import "./entity.tsp";

namespace routes.lists {
  namespace query {
    namespace get {}                                   // GET /lists  (collapsed)
    namespace byOwner {}                               // GET /lists/byOwner
    namespace stats {}                                 // GET /lists/stats
  }

  namespace mut {
    namespace create {}                                // POST /lists/create
    namespace update {}                                // PUT /lists/update
    namespace delete {}                                // DELETE /lists/delete
    namespace archive {}                               // POST /lists/archive  (freeform → POST)
    namespace duplicate {}                             // POST /lists/duplicate (freeform → POST)
  }

  namespace side {}
  namespace deps {}
}
