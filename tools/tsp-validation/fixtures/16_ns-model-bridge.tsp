// TEST: can namespace aliases reference model properties?
// TEST: can we bridge model property types into namespace exports?
// EXPECT: compiles clean
#suppress "experimental-feature" ""

model RouteParams {
  id: string;
  slug: string;
}

model TodoRoute {
  template: "/todos/{id}";
  method: "GET";
  params: RouteParams;
}

// One-level model property access works in namespace aliases
namespace Routes {
  namespace todos {
    alias template = TodoRoute.template;   // "/todos/{id}"
    alias method = TodoRoute.method;       // "GET"
    alias params = TodoRoute.params;       // RouteParams (the type, not the property)

    // Two-level FAILS: TodoRoute.params.id → "ModelProperty has no members"
    // But we can go through the resolved type:
    alias paramId = RouteParams.id;        // string -- access on the TYPE, not through the property chain
  }
}

// Verify namespace deep access works
alias T = Routes.todos.template;     // namespace export → "/todos/{id}"
alias P = Routes.todos.params;       // namespace export → RouteParams
alias PId = Routes.todos.paramId;    // namespace export → string

// The :: accessor the compiler hinted at
alias IdMeta = TodoRoute.params::type;  // does :: give us the type of the property?
