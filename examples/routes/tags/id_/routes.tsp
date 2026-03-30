// Param level: /tags/{id}
import "../entity.tsp";

@param("TagId")
namespace routes.tags.id_ {
  namespace query {
    namespace get {}                                   // GET /tags/{id}
  }

  namespace mut {
    namespace update {}                                // PUT /tags/{id}
    namespace delete {}                                // DELETE /tags/{id}
  }
}
