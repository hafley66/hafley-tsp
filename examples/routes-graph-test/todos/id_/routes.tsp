import "../entity.tsp";
@param("TodoId")
namespace routes.todos.id_ {
  namespace query {
    namespace get {}                                 // GET /todos/{id}
    namespace owner {}                               // GET /todos/{id}/owner  ← M:1 cross-branch
  }
  namespace mut {
    namespace update {}
    namespace delete {}
  }
}
