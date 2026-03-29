// Todo App -- exercises full namespace convention
// Not compileable, demonstrates intent surface + design questions

import "../tools/tsp-validation/lib/reflect.tsp";

scalar TodoId extends string;
scalar ListId extends string;
scalar UserId extends string;
scalar Tag extends string;

enum Priority { low; medium; high; urgent }
enum Status { pending; active; done; archived }

// ─── Todo ──────────────────────────────────────────────────

namespace Todo {
  model Todo {
    id: TodoId;
    listId: ListId;
    ownerId: UserId;
    title: string;
    body?: string;
    status: Status;
    priority: Priority;
    tags: Tag[];
    dueAt?: utcDateTime;
    completedAt?: utcDateTime;
    createdAt: utcDateTime;
    updatedAt: utcDateTime;
  }

  model Filter {
    listId?: ListId;
    status?: Status;
    priority?: Priority;
    tags?: Tag[];
    dueBefore?: utcDateTime;
  }

  namespace query {
    op get(id: TodoId): Todo;
    op list(filter?: Filter): Todo[];
    op count(filter?: Filter): int32;
    op overdue(listId?: ListId): Todo[];
  }

  namespace mut {
    namespace create {
      op single(listId: ListId, title: string, body?: string, priority?: Priority, tags?: Tag[], dueAt?: utcDateTime): Todo;
      op batch(listId: ListId, titles: string[]): Todo[];
      op upsert(id: TodoId, ...Todo): Todo;  // ensure exists with these values
    }

    namespace update {
      op put(id: TodoId, ...Todo): Todo;     // full replace
      op patch(id: TodoId, ...Todo): Todo;   // partial
    }

    namespace delete {
      op single(id: TodoId): Todo;
      op completed(listId: ListId): Todo[];  // bulk: clear done items
    }
  }

  // ── field-reactive side effects ──
  // @onChange: emitter diffs old/new per-mutation, fires on field transitions
  // prev/next signature gives the effect both values to branch on

  namespace side {
    @onChange(Todo, "status")
    op onStatusChange(prev: Todo, next: Todo): void;

    @onChange(Todo, "dueAt")
    op recalcOverdue(prev: Todo, next: Todo): void;

    @onChange(Todo, "listId")
    op reindexListCounts(prev: Todo, next: Todo): void;

    // op-bound effects still useful for lifecycle events
    // create has no "prev" so @onChange doesn't apply
    @timingOn(Todo.mut.create.single)
    op notifyListOwner(todo: Todo): void;
  }
}

// ─── List ──────────────────────────────────────────────────

namespace List {
  model List {
    id: ListId;
    ownerId: UserId;
    name: string;
    description?: string;
    createdAt: utcDateTime;
  }

  namespace query {
    op get(id: ListId): List;
    op byOwner(ownerId: UserId): List[];
    op stats(id: ListId): { total: int32; done: int32; overdue: int32 };
  }

  namespace mut {
    namespace create {
      op single(name: string, description?: string): List;
    }
    namespace update {
      op patch(id: ListId, ...List): List;
    }
    namespace delete {
      op single(id: ListId): List;
    }
  }

  namespace side {
    @timingAfter(List.mut.delete.single)
    op cascadeDeleteTodos(list: List): void;
  }

  namespace deps {
    op todoCount is Todo.query.count;
  }
}

// ─── User ──────────────────────────────────────────────────

namespace User {
  model User {
    id: UserId;
    email: string;
    displayName: string;
    createdAt: utcDateTime;
  }

  namespace query {
    op me(): User;
    op get(id: UserId): User;
  }

  namespace mut {
    namespace create {
      op register(email: string, displayName: string): User;
    }
    namespace update {
      op patch(id: UserId, ...User): User;
    }
    namespace delete {
      op deactivate(id: UserId): User;
    }
  }

  namespace side {
    @timingAfter(User.mut.delete.deactivate)
    op archiveUserLists(user: User): void;

    @timingOn(User.mut.create.register)
    op sendWelcome(user: User): void;
  }
}

// ─── Flow: Daily Review ────────────────────────────────────

namespace DailyReview {
  namespace flow {
    model Input { userId: UserId; asOf: utcDateTime }
    model Self  { lists: List.List[]; overdue: Todo.Todo[]; summary: string }

    op loadLists(userId: UserId): List.List[];
    op findOverdue(lists: List.List[]): Todo.Todo[];
    op buildSummary(overdue: Todo.Todo[]): string;
  }
}

// ─── Flow: Bulk Import ─────────────────────────────────────

namespace BulkImport {
  namespace flow {
    model Input { listId: ListId; csv: string }
    model Self  { parsed: string[]; created: Todo.Todo[]; failed: string[] }

    op parseCsv(csv: string): string[];
    op createEach(listId: ListId, titles: string[]): Todo.Todo[];
    op collectFailures(created: Todo.Todo[], parsed: string[]): string[];
  }
}

// ─── Design Notes ──────────────────────────────────────────
//
// 1. mut/create vs mut/update vs mut/delete carries emitter semantics:
//    - create → POST, no prev for diffing, @onChange can't fire
//    - update → PUT/PATCH, prev/next available, @onChange fires
//    - delete → DELETE, lifecycle teardown
//
// 2. @onChange(Model, field) vs @timingAfter/On/Before(op):
//    - @onChange for field-reactive effects (decoupled from op surface)
//    - @timing* for lifecycle/op-specific effects (create, delete, specific actions)
//    - Both coexist. @onChange only meaningful in update namespace.
//
// 3. Upsert lives in create/ -- intent is "ensure exists"
//    Emitter decides whether to route through create or update path
//
// 4. put/patch as the only update ops. No setter explosion.
//    Field-level reactivity handled by @onChange, not by splitting ops.
//
// 5. ...Todo spread in put/patch/upsert means "fields of this model"
//    Emitter generates Partial<Todo> for patch, full Todo for put.
//
// 6. Open: does @onChange need to express value predicates?
//    e.g. @onChange(Todo, "status", Status.done) -- only when status becomes done
//    Current: effect receives prev/next and branches internally.
//    Predicate form would let emitter optimize (skip diff if status != done).
