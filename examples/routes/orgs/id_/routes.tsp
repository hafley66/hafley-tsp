// Param level: /orgs/{id}
import "../entity.tsp";

@param("OrgId")
namespace routes.orgs.id_ {
  namespace query {
    namespace get {}                                   // GET /orgs/{id}
  }

  namespace mut {
    namespace update {}                                // PUT /orgs/{id}
    namespace delete {}                                // DELETE /orgs/{id}
  }
}
