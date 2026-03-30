import "../../../shared/types.tsp";

namespace routes.todos.id_.tags {
  model Tag {
    id: TagId;
    name: string;
    @manyToMany todos: routes.todos.Todo[];
  }
}
