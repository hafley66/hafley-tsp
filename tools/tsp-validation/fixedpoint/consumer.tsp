// Consumer: verify checked access on the autozone-generated Routes namespace
import "./input.tsp";

// Deep namespace access -- all statically checked by the compiler
alias TodoListMethod = Routes.`/todos`.method;
alias TodoListTemplate = Routes.`/todos`.template;

alias TodoGetMethod = Routes.`/todos/{id}`.method;
alias TodoGetParams = Routes.`/todos/{id}`.params;
alias TodoIdType = Routes.`/todos/{id}`.params.id;

alias TodoCreateMethod = Routes.`/todos/create`.method;
alias TodoUpdateMethod = Routes.`/todos/{id}/update`.method;
alias TodoDeleteMethod = Routes.`/todos/{id}/delete`.method;
