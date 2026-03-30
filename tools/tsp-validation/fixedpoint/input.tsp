// Input: declare route tree + trigger codegen
#suppress "experimental-feature" ""
import "./codegen.tsp";
using Codegen;

namespace routes {
  namespace todos {
    namespace create {}
    namespace read {}
    @param("string") namespace id {
      namespace read {}
      namespace update {}
      namespace delete {}
    }
  }
}

// Trigger codegen -- walks routes namespace, injects autozone below
alias _codegen = generateRoutes(routes);

// --- AUTOZONE START (do not edit) ---
namespace Routes {
  namespace `/todos/create` {
    alias template = "/todos/create";
    alias method = "POST";
  }
  namespace `/todos` {
    alias template = "/todos";
    alias method = "GET";
  }
  namespace `/todos/{id}` {
    alias template = "/todos/{id}";
    alias method = "GET";
    namespace params {
      alias id = string;
    }
  }
  namespace `/todos/{id}/update` {
    alias template = "/todos/{id}/update";
    alias method = "PUT";
    namespace params {
      alias id = string;
    }
  }
  namespace `/todos/{id}/delete` {
    alias template = "/todos/{id}/delete";
    alias method = "DELETE";
    namespace params {
      alias id = string;
    }
  }
}
// --- AUTOZONE END ---
