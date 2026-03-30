import "../shared/types.tsp";

namespace routes.todos {
  model Todo {
    id: TodoId;
    ownerId: UserId;
    title: string;
    @belongsTo owner: routes.users.User;
    @manyToMany tags: routes.todos.id_.tags.Tag[];
  }
}
