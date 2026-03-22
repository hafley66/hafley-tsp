# hafley-tsp Conventions

## Filesystem = Route Tree

The directory structure on disk mirrors the URL path structure. No separate route config file.

### Path mapping rules

| Filesystem | Canonical route |
|---|---|
| `src/api/users/` | `/users` |
| `src/api/users/user_id_/` | `/users/{user_id}` |
| `src/api/users/user_id_/posts.tsp` | `/users/{user_id}/posts` |
| `src/api/users/user_id_/posts/post_id_.tsp` | `/users/{user_id}/posts/{post_id}` |

### Naming rules

- **Trailing underscore** = path parameter: `user_id_` means `{user_id}`
- **No dots in filenames** except before the extension. Rust and Python can't use dots in module names.
- **Underscores only** for word separation in filenames (no camelCase, no kebab-case).
- **Auto-generated files** use `_auto` suffix before extension: `index_auto.tsx`, `index_auto.rs`
- **Manual files** are the bare name: `index.tsx`, `index.rs`. Never overwritten by the emitter.
- **Directory = URL segment**, file = leaf route or contains operations for that segment.

### Emitter output structure (React/TanStack Router)

```
src/routes/users/user_id_/
  index_auto.tsx     <- emitter writes: state, events, reducer, createFileRoute, typed useParams
  index.tsx          <- dev writes: render body, effects wiring. never overwritten.
```

### Emitter output structure (Rust/Dioxus or Axum)

```
src/routes/users/user_id_/
  index_auto.rs      <- emitter writes: state struct, event enum, reducer fn, route registration
  index.rs           <- dev writes: component/handler body. never overwritten.
```

### HTTP operations

For API routes, HTTP methods map to functions within the file at that path:

```
src/api/users/user_id_/posts.tsp    <- defines GET /users/:userId/posts, POST /users/:userId/posts
src/api/users/user_id_/posts/post_id_.tsp <- defines GET, PUT, DELETE for /users/:userId/posts/:postId
```

## Path-File Concordance

The TypeSpec file's filesystem path is the canonical route. The emitter validates that any route declared inside a `.tsp` file matches the file's actual disk path.

- `src/api/users/user_id_/posts.tsp` MUST declare a route matching `/users/:userId/posts`
- If the file path and declared route disagree, that's a compile error
- The emitter outputs to separate folders per language target (`out/react/`, `out/rust/`, etc.) but the source `.tsp` files live in the canonical path structure

### Watcher / dev loop (goal)

A file watcher runs alongside frontend and backend dev servers:

1. `.tsp` file changes -> emitter re-runs -> emitted `_auto` files update -> dev servers hot-reload
2. Watcher scans all `.tsp` files and validates each file contains a route declaration matching its filesystem path
3. If a `.tsp` file exists at a path but has no matching route declaration, the watcher flags it
4. If emitted code references a route that has no corresponding `.tsp` file, the watcher flags it

The watcher output is a shareLatest-style stream: always has the latest validation state, new subscribers get current state immediately.

## TypeSpec Modeling Rules

### Explicit generics, no implicit typing

All type relationships must be expressed through TypeSpec's type system: template parameters, `extends`, or named types. The emitter reads type information via `isTemplateInstance`, `getTemplateMapper`, or type kind checks. Never pattern-match on field names.

### Template primitives

```tsp
model Component<TProps, TState, TEvents> {
  props: TProps;
  state: TState;
  events: TEvents;
}

model Route<TComponent> {
  component: TComponent;
}
```

The emitter identifies these by checking `templateMapper.args` on the compiler type, not by looking for fields named "state" or "events".

### Route table

```tsp
model AppRoutes {
  "/": Route<Component<{}, DashboardState, DashboardEvent>>;
  "/users/{user_id}": Route<Component<{}, UserDetailState, UserDetailEvent>>;
}
```

Property keys are path literals. Values are `Route<Component<...>>` template instances. The emitter derives the filesystem layout from these keys using the path mapping rules above.

### No decorator soup

Minimize decorator usage. Prefer structural modeling (fields, generics, extends) over annotations. Decorators are acceptable for metadata that genuinely cannot be expressed structurally, but the bar is high. 

We are trying to have MIN(decorator-calls) and MIN(typespec-feature usage)

### No identifier renaming

Names in TypeSpec pass through to emitted code verbatim. No camelCase-to-snake_case, no PascalCase normalization. If the TypeSpec says `user_id`, the emitted Rust says `user_id`, the emitted TypeScript says `user_id`. The goal is grep-ability across the entire codebase -- one name, one string, every language.

## Path Parameter Convention

The file watcher derives route paths from the filesystem using postfix underscore for params. The derived path uses `{param}` syntax (TypeSpec/OpenAPI style), not framework-specific syntax:

| Filesystem | Derived route path |
|---|---|
| `src/api/users/` | `/users` |
| `src/api/users/user_id_/` | `/users/{user_id}` |
| `src/api/users/user_id_/posts/` | `/users/{user_id}/posts` |
| `src/api/users/user_id_/posts/post_id_/` | `/users/{user_id}/posts/{post_id}` |

In TypeSpec, all parameterized strings use URL-style `{param}` delimiters. This is the only delimiter convention in TypeSpec source. The emitter translates to target framework syntax as needed -- that's the emitter's problem, not the spec's.

- TanStack Router: `$user_id`
- React Router: `:user_id`
- Dioxus Router: `:user_id`
- Axum: `:user_id`
- OpenAPI: `{user_id}` (identity)

## Cross-Boundary Type Authority

TypeSpec is the single source of truth for ANY string, enum, or type that crosses a process/system boundary. If it leaves your function and enters another system, it belongs in TypeSpec. Even if only one language consumes it today.

### Boundaries include (not exhaustive)

- HTTP routes (REST, OpenAPI)
- WebSocket message types
- SSE event names and payloads
- Chrome extension message passing (runtime.sendMessage, port.postMessage)
- AMQP / message queue routing keys and payloads
- AsyncAPI specs
- URL patterns (frontend routes, API routes, webhook URLs)
- IPC channels
- gRPC service definitions
- Environment variable names
- Feature flag keys
- Analytics event names
- Cache keys

### The principle

Every boundary string is a URL -- a parameterized template with zero or more params. Don't distinguish between "route URL" and "other template string." A WebSocket channel name with params, a cache key pattern, an AMQP routing key -- they're all the same type: a URL template. One type concept, not many.

No string literals in TypeSpec source that represent boundary values. If it's a closed set, it's a model or enum. If it's parameterized, it's a URL template type. No inline strings in decorator arguments that are actually named dictionary keys.

TypeSpec does not have delimiters. If an external system uses delimited namespacing (e.g. AMQP `orders.created.us-east`, Redis `cache:user:42`, analytics `page_view.dashboard.main`), those delimiter-separated segments become denormalized at the TypeSpec level -- separate fields, separate enum members, separate model properties. The emitter re-assembles them with the target system's delimiter on output. TypeSpec holds the structure, not the serialization format.

The point is not "use TypeSpec because it's the best IDL." The point is: one place for the closed set, N emitters to N targets. A greater macro engine. When the set changes, every consumer sees it at compile time.

### Don't fight single-target emission

If a type only has one consumer today, it still belongs in TypeSpec if it's a boundary type. The cost of putting it in TypeSpec is low. The cost of extracting it later when a second consumer appears is high. Don't rationalize keeping it in application code because "it's only used in one place right now."

### Env vars are model fields

Environment variable names are not strings passed to decorators. They are fields on a config model. The emitter handles loading/reading per target. Visibility (`server`/`client`/`shared`) determines which targets get which fields -- that's an emitter concern with a dedicated config emission strategy, not decorator annotations on each field.

### Exhaustive matching

Every enum and discriminated union emitted from TypeSpec must produce exhaustive match scaffolding in the target language:
- TypeScript: discriminated union with `switch (event.type)` covering all cases (already implemented in reducer emitter)
- Rust: `match` expression covering all variants (compiler enforces this naturally)

This is a hard requirement for all emitters. If a new variant is added in TypeSpec, emitted code must fail to compile in every target until handled.

## Filesystem Discipline

### No generic folder names, no file explosion

No `users/users_controller.ts`, no `users/users_view.ts`, no `users/users_service.ts`. The domain IS the folder. Files inside are operations and types for that domain segment. Folders grow according to domain, stay tree-shaped. If you need lateral conceptualization (joining two domains), make a file that acts as a relation, or include the logic in the parent.

### Numeric prefix ordering

Files use numeric prefixes to force read/dependency order: `0_types.tsp`, `1_list.tsp`, `2_get.tsp`. The file watcher strips prefixes when deriving route paths -- the number is metadata for humans and tooling, not part of the URL.

### Colocation over separation

Keep types, operations, and state for a domain segment in the same folder. Only split into subfolders when a child route/resource appears. One file is better than three files that each contain one thing.

## Emitter Build System

### Auto file preamble and diffing

Every `_auto` file gets a comment header:
- Last render timestamp
- Hash of inputs
- List of source `.tsp` files that contributed to this output

On next emit: strip preamble from both old and new, diff bodies. If identical production, don't touch the file (preserves mtime, avoids unnecessary hot-reload). Fast path: if input hash unchanged, skip diff entirely.

### Auto routing index

When a `.tsp` file uses the `Route<Component<...>>` template, the emitter knows it contributes a route. The emitter collects all route instances across all compiled `.tsp` files and auto-generates the central routing index per target:
- TanStack Router: `routeTree.gen.ts`
- Axum: `router_auto.rs` with all `.route()` calls
- Dioxus: `Route` enum with all variants

Import order in the TypeSpec source determines route registration order in the index. Nobody hand-maintains the index file.

### Import resolution via Alloy binder

Alloy's binder handles cross-file imports automatically. When a refkey is used in file B that was declared in file A, the binder walks the scope chain, finds the common ancestor, and generates the import statement. This is reactive and order-independent.

Name collisions are resolved by Alloy's `nameConflictResolver`: first-declared symbol keeps its name, subsequent collisions get `_2`, `_3` suffixes. Import symbols are renamed before local symbols.

The root aggregate (barrel) file uses Alloy's built-in `BarrelFile` component, which auto-generates `export * from "./file.js"` for all siblings and nested barrels. If a type moves due to hoisting, the barrel regenerates and all refkey-based imports resolve correctly.

No manual import management. No denormalized names. The binder is the stable bridge.

Manual files also participate in Alloy's scope graph. When a dev writes manual code that references an auto-generated type, the binder resolves and generates the import the same way it does for auto-to-auto references.

### Emission modes (per file or zone)

1. **Full auto** -- no manual file exists yet, emitter generates everything
2. **Fill-in-the-blanks** -- auto zone emitted, manual zone preserved (default working mode)
3. **Opted out** -- dev places opt-out marker in file, emitter skips emission for that file/zone. TypeSpec still compiles and validates the types, but generates no output. The spec becomes a type-checker only for opted-out areas.

Detection: if the manual file contains an opt-out marker comment, or if the `_auto` file is deleted by the dev, the emitter respects that and stops generating. TypeSpec compilation still runs, still validates, still catches type errors -- it just doesn't write files.

## Domain Modeling Language

### CRUD words, not HTTP verbs

TypeSpec models describe domain operations, not transport. Use `create`, `read`, `update`, `delete`, `list` -- not `GET`, `POST`, `PUT`, `PATCH`.

If a domain has multiple update intents, name them by what they do:
- `update_profile`, `update_avatar`, `change_password` -- not `PUT /users/{id}` three times
- `archive_post`, `publish_post` -- not `PATCH /posts/{id}` with a status field

The emitter maps domain operations to HTTP methods, gRPC calls, WebSocket messages, or whatever the target needs. The TypeSpec source doesn't know or care about transport.

This applies to event/reducer naming too. Events are domain actions: `add_item`, `remove_item`, `clear_cart` -- not `post_item`, `delete_item`.
