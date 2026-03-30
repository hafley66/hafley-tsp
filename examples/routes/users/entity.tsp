import "../_types.tsp";

model User {
  id: UserId;
  orgId: OrgId;
  email: string;
  displayName: string;
  createdAt: utcDateTime;

  // M-1: user belongs to one org
  @belongsTo org: Org;

  // 1-M: user owns many todos, lists, comments
  @hasMany todos: Todo[];
  @hasMany lists: List[];
  @hasMany comments: Comment[];
}
