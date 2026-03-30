// Entity root: /todos
// Full surface: query/, mut/, side/
import "./entity.tsp";

namespace routes.todos {
  namespace query {
    namespace get {}                                   // GET /todos  (collapsed)
    namespace list {}                                  // GET /todos/list
    namespace count {}                                 // GET /todos/count
    namespace overdue {}                               // GET /todos/overdue
  }

  namespace mut {
    namespace create {}                                // POST /todos/create
    namespace update {}                                // PUT /todos/update
    namespace delete {}                                // DELETE /todos/delete
  }

  namespace side {}
}
