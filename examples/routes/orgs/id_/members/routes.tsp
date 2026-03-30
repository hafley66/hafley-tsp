// 1-M traversal: /orgs/{id}/members
// Org hasMany Users. This route exposes the relationship as a sub-resource.
// DB: SELECT * FROM users WHERE org_id = {id}
// Single join, scoped to parent.
import "../../entity.tsp";

namespace routes.orgs.id_.members {
  namespace query {
    namespace get {}                                   // GET /orgs/{id}/members
  }

  namespace mut {
    // "invite" is freeform → POST /orgs/{id}/members/invite
    namespace invite {}

    // "remove" is freeform → POST /orgs/{id}/members/remove
    // (not DELETE because removing membership, not deleting user)
    namespace remove {}
  }
}
