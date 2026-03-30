// M-M junction: /todos/{id}/tags
// Todo manyToMany Tags via todo_tags junction table.
// DB: SELECT tg.* FROM tags tg
//     JOIN todo_tags tt ON tg.id = tt.tag_id
//     WHERE tt.todo_id = {id}
//
// M-M routes have link/unlink semantics, not create/delete.
// The tag entity already exists; we're managing the junction row.
import "../../entity.tsp";

namespace routes.todos.id_.tags {
  namespace query {
    namespace get {}                                   // GET /todos/{id}/tags
  }

  namespace mut {
    // link/unlink are freeform → POST
    // These manage junction table rows, not the tag entity itself.
    // POST /todos/{id}/tags/link   body: { tagId: TagId }
    // POST /todos/{id}/tags/unlink body: { tagId: TagId }
    namespace link {}                                  // POST /todos/{id}/tags/link
    namespace unlink {}                                // POST /todos/{id}/tags/unlink
  }
}
