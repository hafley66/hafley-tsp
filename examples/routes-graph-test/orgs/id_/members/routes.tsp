// 1:M traversal: Org.members → User[]
// DB: SELECT * FROM users WHERE org_id = ?
import "../../entity.tsp";
namespace routes.orgs.id_.members {
  namespace query { namespace get {} }               // GET /orgs/{id}/members
}
