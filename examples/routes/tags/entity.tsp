import "../_types.tsp";

model Tag {
  id: TagId;
  name: string;
  color?: string;

  // M-M: tag belongs to many todos (inverse side of junction)
  @manyToMany todos: Todo[];
}
