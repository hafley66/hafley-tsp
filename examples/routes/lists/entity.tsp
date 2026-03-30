import "../_types.tsp";

model List {
  id: ListId;
  ownerId: UserId;
  name: string;
  description?: string;
  createdAt: utcDateTime;

  // M-1: list belongs to a user
  @belongsTo owner: User;

  // 1-M: list contains many todos
  @hasMany todos: Todo[];
}

model ListStats {
  total: int32;
  done: int32;
  overdue: int32;
}
