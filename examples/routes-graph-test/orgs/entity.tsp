import "../shared/types.tsp";
import "../users/entity.tsp";

namespace routes.orgs {
  model Org {
    id: OrgId;
    name: string;
    @hasMany members: routes.users.User[];
  }
}
