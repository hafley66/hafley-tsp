// Param level: /lists/{id}
// Freeform mut actions at param level too.
import "../entity.tsp";

@param("ListId")
namespace routes.lists.id_ {
  namespace query {
    namespace get {}                                   // GET /lists/{id}  (collapsed)
    namespace stats {}                                 // GET /lists/{id}/stats
  }

  namespace mut {
    namespace update {}                                // PUT /lists/{id}/update
    namespace delete {}                                // DELETE /lists/{id}/delete
    namespace archive {}                               // POST /lists/{id}/archive  (freeform → POST)
    namespace duplicate {}                             // POST /lists/{id}/duplicate (freeform → POST)
  }
}
