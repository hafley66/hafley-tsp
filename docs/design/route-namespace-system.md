# Route-Namespace System

## Context

TSP functions can receive string literals, walk namespace trees, and create Model types programmatically (validated in fixtures 2, 3, 7). This plan builds a route system where namespaces ARE the route tree, a `@param` decorator marks dynamic segments, CRUD namespace names infer HTTP methods, and a `flattenRoutes` function collapses the tree into a typed model of route entries.

The goal: route config as namespace structure, auto-typed path params, conventional HTTP method inference.

## Files to modify

| File | Action |
|------|--------|
| `tools/tsp-validation/lib/route.tsp` | Add `@param` decorator decl + `flattenRoutes` fn decl |
| `tools/tsp-validation/lib/route.js` | Add `$param` export + `flattenRoutes` impl (clean rewrite, current file is exploratory dumps) |
| `tools/tsp-validation/fixtures/9_route-namespaces.tsp` | New fixture exercising the full pipeline |

## Convention

```
namespace users {
  namespace create {}           → POST /users/create
  namespace read {}             → GET  /users          (read collapses to parent)
  namespace delete {}           → DELETE /users/delete
  namespace update {}           → PUT  /users/update
  namespace updatePatch {}      → PATCH /users/updatePatch

  @param("string")
  namespace id {
    namespace read {}           → GET  /users/{id}     (read collapses)
    namespace update {}         → PUT  /users/{id}/update
  }
}
```

CRUD map: `{ create: "POST", read: "GET", delete: "DELETE", update: "PUT", updatePatch: "PATCH" }`

`read` is special: collapses to parent path (no `/read` segment). All others append their name.

## Implementation

### 1. `@param` decorator (route.tsp + route.js)

```tsp
extern dec param(target: Reflection.Namespace, typeName: valueof string);
```

JS side: store type string in `stateMap` keyed by a module-level Symbol. The `flattenRoutes` walker reads it back.

### 2. `flattenRoutes` function

Receives `Reflection.Namespace`. Recursive walk:

1. For each child namespace:
   - If decorated with `@param` → dynamic segment `{name}`, accumulate param into Map, recurse into children
   - If name is a CRUD verb → emit route entry (path = parent path for `read`, parent + `/name` for others), do NOT recurse
   - Otherwise → regular path segment, recurse

2. Build return Model where each property is keyed by path string, value is a model with `{ template: stringLiteral, params: Model, method: stringLiteral }`

Uses proven checker APIs: `createType({kind:"Model"})`, `createType({kind:"ModelProperty"})`, `getStdType("string")`, `finishType()`.

### 3. Clean up route.js

Current route.js is exploratory console.log dumps from the discovery session. Rewrite it clean:
- Keep `path()` fn but stripped of debug logging
- Add `$param` decorator
- Add `flattenRoutes` to `$functions.Route`

### 4. Fixture

```tsp
namespace routes {
  namespace users {
    namespace create {}
    namespace read {}
    namespace delete {}
    namespace update {}
    namespace updatePatch {}

    @param("string")
    namespace id {
      namespace read {}
      namespace update {}
    }
  }
}

alias AllRoutes = flattenRoutes(routes);

// Verify usable as type
model AppRoutes { ...AllRoutes; }
```

Expected output model:
```
{
  "/users": { template: "/users", params: {}, method: "GET" }
  "/users/create": { template: "/users/create", params: {}, method: "POST" }
  "/users/delete": { template: "/users/delete", params: {}, method: "DELETE" }
  "/users/update": { template: "/users/update", params: {}, method: "PUT" }
  "/users/updatePatch": { template: "/users/updatePatch", params: {}, method: "PATCH" }
  "/users/{id}": { template: "/users/{id}", params: { id: string }, method: "GET" }
  "/users/{id}/update": { template: "/users/{id}/update", params: { id: string }, method: "PUT" }
}
```

## Risks

- `createType({kind:"String", value:"..."})` for string literal types -- untested. Fallback: use `getStdType("string")` and log the literal value.
- `extern dec` targeting `Reflection.Namespace` -- may not be a valid decorator target kind. Fallback: `target: unknown` with runtime check.
- `stateMap` with Symbol -- proven pattern in decorator-def package, should work.

## Verification

```bash
cd tools/tsp-validation
npx tsp compile fixtures/9_route-namespaces.tsp --no-emit
# Should compile clean (warnings ok, no errors)
# Console output should show the generated route entries
bash validate.sh
# All fixtures including new one should pass
```
