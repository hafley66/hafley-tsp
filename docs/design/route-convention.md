# Route Convention

## Method Resolution

Given a namespace's position in the tree, HTTP method is deterministic:

### mut/ children

| Name | Method | Path behavior |
|------|--------|--------------|
| `create` | POST | appends `/create` (or collapses if only create op) |
| `update` | PUT | appends `/update` |
| `updatePatch` | PATCH | appends `/updatePatch` |
| `delete` | DELETE | appends `/delete` |
| anything else | POST | appends `/{name}` (freeform action) |

### query/ children

| Name | Method | Path behavior |
|------|--------|--------------|
| `read` | GET | collapses to parent path (no segment) |
| `get` | GET | collapses to parent path (no segment) |
| anything else | GET | appends `/{name}` |
| anything with `@POST` | POST | appends `/{name}` (JSON body query) |

`read`/`get` collapse because they represent "the default read for this resource." Everything else is a named query endpoint.

## File System Mapping

```
api/
  _types.tsp              shared scalars, enums
  _scaffold.tsp           imports all routes, calls flattenRoutes

  {entity}/
    entity.tsp            model, filter, id scalar, related enums
    routes.tsp            query/, mut/, side/, deps/ at entity root
    {param}_/
      routes.tsp          query/, mut/ only (no side/deps)
      {sub_resource}/
        entity.tsp        sub-resource model
        routes.tsp         query/, mut/, side/, deps/ (sub-resource is its own entity root)
        {param}_/
          routes.tsp
```

### Naming rules

- Folder name = URL path segment, `snake_case` always
- Postfix underscore = dynamic param: `id_/` means `{id}` in the URL path
- Every param folder's `routes.tsp` must declare `@param` with type
- Folder names must be valid Rust identifiers (no hyphens, no reserved words)

### File responsibilities

| File | Contains | Appears where |
|------|----------|---------------|
| `_types.tsp` | Shared scalars, base enums | Root only |
| `_scaffold.tsp` | Import tree, flattenRoutes call | Root only |
| `entity.tsp` | Model, Filter, Id scalar, entity-specific enums | Entity root (any folder that introduces a new model type) |
| `routes.tsp` | query/, mut/ namespaces with ops | Every path level |

### What goes in routes.tsp at each level

**Entity root** (e.g., `todos/routes.tsp`):
- `query/` -- list, count, and other collection-level reads
- `mut/` -- create (collection-level), bulk operations
- `side/` -- @onChange and @timing effects for this entity
- `deps/` -- cross-entity op references

**Param level** (e.g., `todos/id_/routes.tsp`):
- `query/` -- get (single resource read)
- `mut/` -- update, delete, freeform actions on single resource
- NO `side/`, NO `deps/` (those bind to the entity, not the path level)

**Sub-resource root** (e.g., `todos/id_/comments/routes.tsp`):
- Same as entity root. A sub-resource IS an entity from the convention's perspective.

### Import DAG

Strict, acyclic:

```
_types.tsp
    ↓
entity.tsp         (imports _types or parent entity)
    ↓
routes.tsp         (imports entity.tsp)
    ↓
_scaffold.tsp      (imports all routes)
```

Cross-entity references in `deps/` use fully qualified namespace paths resolved at compile time, not file imports.

## Namespace Merging

TSP namespace merging lets multiple files contribute to one tree. Each `routes.tsp` reopens the namespace at its depth:

```tsp
// todos/routes.tsp
namespace routes.todos { ... }

// todos/id_/routes.tsp
@param("TodoId")
namespace routes.todos.id_ { ... }

// todos/id_/comments/routes.tsp
namespace routes.todos.id_.comments { ... }
```

After compilation, these merge into a single `routes` namespace tree. `flattenRoutes` walks it as one structure.

## Three Tiers of Automation

### Tier 0: Manual

Write `entity.tsp` and `routes.tsp` by hand. The convention is naming rules only. TypeSpec validates types at compile time.

### Tier 1: Scaffold

Create folders and `entity.tsp`. A scaffold fn generates `routes.tsp` files with empty query/mut namespaces and autozone markers. You write ops between the markers. Re-running scaffold adds structure for new folders without touching existing ops.

```tsp
// ── AUTOZONE:structure:begin (regenerated) ──
@param("TodoId")
namespace routes.todos.id_ {
  @queries namespace query {
// ── AUTOZONE:structure:end ──

    op get(id: TodoId): Todo;

// ── AUTOZONE:close:begin (regenerated) ──
  }
  @mutations namespace mut {
// ── AUTOZONE:close:end ──

    namespace update {
      op patch(id: TodoId, ...Todo): Todo;
    }

// ── AUTOZONE:final:begin (regenerated) ──
  }
}
// ── AUTOZONE:final:end ──
```

### Tier 2: Full codegen

Decorate the model with `@crud` and the fixed-point loop generates complete CRUD ops. Custom ops go outside autozone blocks. Eject by removing `@crud` and the autozone markers.

## Route Table Output

`flattenRoutes(routes)` produces a flat route table. For the todo example:

```
POST   /todos/create          → routes.todos.mut.create
GET    /todos                  → routes.todos.query.get (collapsed read)
GET    /todos/list             → routes.todos.query.list
GET    /todos/count            → routes.todos.query.count
GET    /todos/overdue          → routes.todos.query.overdue
GET    /todos/{id}             → routes.todos.id_.query.get (collapsed read)
PUT    /todos/{id}/update      → routes.todos.id_.mut.update
DELETE /todos/{id}/delete      → routes.todos.id_.mut.delete
GET    /todos/{id}/comments    → routes.todos.id_.comments.query.get
POST   /todos/{id}/comments/create → routes.todos.id_.comments.mut.create
```
