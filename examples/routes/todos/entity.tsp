import "../_types.tsp";

model Todo {
  id: TodoId;
  listId: ListId;
  ownerId: UserId;
  title: string;
  body?: string;
  status: Status;
  priority: Priority;
  dueAt?: utcDateTime;
  completedAt?: utcDateTime;
  createdAt: utcDateTime;
  updatedAt: utcDateTime;

  // M-1: todo belongs to a list and a user
  @belongsTo list: List;
  @belongsTo owner: User;

  // 1-M: todo has many comments
  @hasMany comments: Comment[];

  // M-M: todo has many tags (junction table: todo_tags)
  @manyToMany tags: Tag[];
}

model TodoFilter {
  listId?: ListId;
  status?: Status;
  priority?: Priority;
  tags?: Tag[];
  dueBefore?: utcDateTime;
}
