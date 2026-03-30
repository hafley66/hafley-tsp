import "../shared/types.tsp";

namespace routes.users {
  model User {
    id: UserId;
    orgId: OrgId;
    name: string;
    @belongsTo org: routes.orgs.Org;
    @hasMany todos: routes.todos.Todo[];
  }
}
