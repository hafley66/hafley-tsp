// TEST: namespace-based route info with deep path access
// EXPECT: compiles clean

namespace Routes {
  namespace `todos` {
    alias template = "/todos";
    alias method = "GET";
  }

  namespace `todos/{id}` {
    alias template = "/todos/{id}";
    alias method = "GET";

    namespace params {
      alias id = string;
    }
  }
}

// Deep access through namespaces
alias TodoItemTemplate = Routes.`todos/{id}`.template;
alias TodoItemId = Routes.`todos/{id}`.params.id;

// Use in op
op read(id: Routes.`todos/{id}`.params.id): string;
