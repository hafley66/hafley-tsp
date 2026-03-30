// TEST: member access on template-instantiated models
// TEST: one-level works, two-level hits same ModelProperty wall
// EXPECT: compiles clean

model RouteEntry<Path extends string, Method extends string, Params extends Reflection.Model> {
  template: Path;
  method: Method;
  params: Params;
}

// Concrete instantiations (what codegen would stamp out)
model TodosByIdParams { id: string; slug: string; }
alias TodosByIdGet = RouteEntry<"/todos/{id}", "GET", TodosByIdParams>;

// One-level access -- WORKS
alias Path = TodosByIdGet.template;     // "/todos/{id}"
alias Method = TodosByIdGet.method;     // "GET"
alias Params = TodosByIdGet.params;     // TodosByIdParams

// Two-level -- FAILS: "ModelProperty has no members"
// alias ParamId = TodosByIdGet.params.id;

// Workaround: access the params model directly
alias ParamId = TodosByIdParams.id;     // string

// Spread from instantiation -- WORKS
model Flat { ...TodosByIdGet; }

// Use in op signatures via direct params model
op getTodo(id: TodosByIdParams.id): void;
