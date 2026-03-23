# @hafley/alloy-rs

TypeSpec-to-Rust code generation. Turns TypeSpec models into compilable Rust crates with correct `use`, `mod`, serde derives, and cross-file references.

## What it generates

Given TypeSpec like this:

```typespec
model User {
  id: int64;
  name: string;
  email?: string;
  address: Address;
  role: Role;
}

model Address {
  street: string;
  city: string;
}

enum Role { Admin, Member, Guest }

model Team {
  name: string;
  members: User[];
  metadata: Record<string, string>;
  created_at: utcDateTime;
}
```

You get a crate:

```
src/
  lib.rs              # pub mod models;
  models.rs           # all model types in one file
```

Where `models.rs` looks like:

```rust
use chrono::DateTime;
use chrono::Utc;
use serde::Deserialize;
use serde::Serialize;
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Address {
  pub street: String,
  pub city: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum Role {
  Admin,
  Member,
  Guest,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
  pub id: i64,
  pub name: String,
  pub email: Option<String>,
  pub address: Address,
  pub role: Role,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Team {
  pub name: String,
  pub members: Vec<User>,
  pub metadata: HashMap<String, String>,
  pub created_at: DateTime<Utc>,
}
```

Related types in the same module reference each other directly -- no `use crate::` needed within the file. Cross-file references (e.g. from route handlers) still produce `use crate::models::User` automatically.

## Using with TypeSpec

The adapter converts a TypeSpec program into Rust output in two steps: extract types from the compiler, then emit.

```ts
import { compile } from "@typespec/compiler";
import { programToTypeDefs } from "@hafley/alloy-rs/adapters";
import { emitCrate } from "@hafley/alloy-rs/emitter";

// 1. Compile a .tsp file (or pass an existing Program from a custom emitter)
const program = await compile("./main.tsp");

// 2. Extract models and enums from all user-defined namespaces
//    Skips TypeSpec stdlib types. Resolves scalar chains (e.g. uuid -> string).
const types = programToTypeDefs(program);

// 3. Emit a Rust crate
const output = emitCrate(types);
```

`programToTypeDefs` walks the program's global namespace, recursing into child namespaces while skipping the `TypeSpec` stdlib. It converts:

- `model` with scalar properties into struct definitions
- `enum` into enum definitions with optional values
- `model` references (a property typed as another model) into cross-type references
- `T[]` (Array with indexer) into `Vec<T>`
- `Record<K, V>` (Record with indexer) into `HashMap<K, V>`
- Scalar chains (`scalar uuid extends string`) are resolved to the root scalar name

For finer control, use `namespaceToTypeDefs` to target a specific namespace:

```ts
import { namespaceToTypeDefs } from "@hafley/alloy-rs/adapters";

// Extract from a specific namespace, non-recursive
const types = namespaceToTypeDefs(myNamespace);

// Or recurse into sub-namespaces
const allTypes = namespaceToTypeDefs(myNamespace, { recursive: true });
```

Types that the adapter doesn't handle (unions, literals, etc.) fall back to `string`.

## Type mapping

| TypeSpec | Rust | Crate dependency |
|---|---|---|
| `string` | `String` | - |
| `boolean` | `bool` | - |
| `int8` .. `int64` | `i8` .. `i64` | - |
| `uint8` .. `uint64` | `u8` .. `u64` | - |
| `float32`, `float64` | `f32`, `f64` | - |
| `bytes` | `Vec<u8>` | - |
| `utcDateTime` | `DateTime<Utc>` | `chrono` |
| `offsetDateTime` | `DateTime<FixedOffset>` | `chrono` |
| `plainDate` | `NaiveDate` | `chrono` |
| `plainTime` | `NaiveTime` | `chrono` |
| `duration` | `Duration` | std |
| `uuid` | `Uuid` | `uuid` |
| `decimal` | `Decimal` | `rust_decimal` |
| `T?` (optional) | `Option<T>` | - |
| `T[]` | `Vec<T>` | - |
| `Record<K, V>` | `HashMap<K, V>` | std |
| model reference | type name + `use crate::` | - |
| enum reference | type name + `use crate::` | - |

## How to: serde structs and enums

The components handle serde at two levels -- container attributes on structs/enums, and field attributes on individual fields.

```tsx
import { Output, render, refkey, List } from "@alloy-js/core";
import { StructDeclaration, StructField } from "@hafley/alloy-rs";
import { EnumDeclaration, UnitVariant, StructVariant } from "@hafley/alloy-rs";
import { SourceFile, CrateDirectory, ModDirectory } from "@hafley/alloy-rs";
import { VisibilityContext } from "@hafley/alloy-rs";

// Struct with serde field config
<SourceFile path="event.rs" externalUses={["serde::Deserialize", "serde::Serialize"]}>
  <StructDeclaration
    name="Event"
    derive={["Debug", "Clone", "Serialize", "Deserialize"]}
    serde={{ denyUnknownFields: true }}
  >
    <List hardline>
      <StructField name="id" type="i64" />
      <StructField name="name" type="String" />
      <StructField name="metadata" type="String"
        serde={{ skipSerializingIf: "String::is_empty" }} />
      <StructField name="internal" type="bool"
        serde={{ skip: true }} />
      <StructField name="config" type="Config"
        serde={{ flatten: true }} />
    </List>
  </StructDeclaration>
</SourceFile>
```

Produces:

```rust
use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Event {
  pub id: i64,
  pub name: String,
  #[serde(skip_serializing_if = "String::is_empty")]
  pub metadata: String,
  #[serde(skip)]
  pub internal: bool,
  #[serde(flatten)]
  pub config: Config,
}
```

Tagged enums work the same way:

```tsx
<EnumDeclaration
  name="Message"
  derive={["Debug", "Clone", "Serialize", "Deserialize"]}
  serde={{ tag: "type", content: "data" }}
>
  <List hardline>
    <StructVariant name="Text">
      <StructField name="body" type="String" />
    </StructVariant>
    <StructVariant name="Image">
      <StructField name="url" type="String" />
      <StructField name="width" type="u32" />
    </StructVariant>
    <UnitVariant name="Ping" />
  </List>
</EnumDeclaration>
```

Produces:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum Message {
  Text {
    pub body: String,
  },
  Image {
    pub url: String,
    pub width: u32,
  },
  Ping,
}
```

### Serde config options

**Container** (`serde` prop on `StructDeclaration` / `EnumDeclaration`):

| Config key | Rust output |
|---|---|
| `tag: "t"` | `#[serde(tag = "t")]` |
| `content: "c"` | `#[serde(content = "c")]` |
| `untagged: true` | `#[serde(untagged)]` |
| `denyUnknownFields: true` | `#[serde(deny_unknown_fields)]` |
| `default: true` | `#[serde(default)]` |
| `transparent: true` | `#[serde(transparent)]` |

**Field** (`serde` prop on `StructField`):

| Config key | Rust output |
|---|---|
| `skip: true` | `#[serde(skip)]` |
| `skipSerializing: true` | `#[serde(skip_serializing)]` |
| `skipDeserializing: true` | `#[serde(skip_deserializing)]` |
| `skipSerializingIf: "Option::is_none"` | `#[serde(skip_serializing_if = "Option::is_none")]` |
| `default: true` | `#[serde(default)]` |
| `default: "default_val"` | `#[serde(default = "default_val")]` |
| `flatten: true` | `#[serde(flatten)]` |
| `with: "my_serde"` | `#[serde(with = "my_serde")]` |
| `alias: "old_name"` | `#[serde(alias = "old_name")]` |

## How to: axum endpoints

Two components for endpoints, depending on whether you want paired files or zone-based single files.

### Paired files with `<Endpoint>`

Generates `name_auto.rs` (framework glue, regenerated) and `name.rs` (domain logic, yours).

```tsx
import { Output, render, refkey, List } from "@alloy-js/core";
import { StructDeclaration, StructField, Endpoint } from "@hafley/alloy-rs";
import { SourceFile, CrateDirectory, ModDirectory } from "@hafley/alloy-rs";
import { VisibilityContext } from "@hafley/alloy-rs";
import { ZoneProvider, Zone } from "@hafley/alloy-rs";
import { FunctionDeclaration } from "@hafley/alloy-rs";

const userKey = refkey();
const postKey = refkey();

render(
  <Output>
    <VisibilityContext.Provider value="pub">
      <ZoneProvider>
        <CrateDirectory>
          {/* Models -- all in one file */}
          <SourceFile path="models.rs" externalUses={["serde::Deserialize", "serde::Serialize"]}>
            <StructDeclaration name="User" refkey={userKey}
              derive={["Debug", "Clone", "Serialize", "Deserialize"]}>
              <List hardline>
                <StructField name="id" type="i64" />
                <StructField name="name" type="String" />
              </List>
            </StructDeclaration>
            {"\n"}
            <StructDeclaration name="Post" refkey={postKey}
              derive={["Debug", "Clone", "Serialize", "Deserialize"]}>
              <List hardline>
                <StructField name="id" type="i64" />
                <StructField name="title" type="String" />
              </List>
            </StructDeclaration>
          </SourceFile>

          {/* Endpoints */}
          <ModDirectory name="routes">
            <Endpoint
              name="list_users"
              path="/users"
              method="get"
              routePath="routes::list_users_auto"
              responseModel={userKey}
              responseList
            />
            <Endpoint
              name="get_user"
              path="/users/:id"
              method="get"
              routePath="routes::get_user_auto"
              responseModel={userKey}
              params={[{
                extractor: "Path(user_id)",
                extractorType: "Path<i64>",
                name: "user_id",
                type: "i64",
              }]}
            />
          </ModDirectory>

          {/* Router with zone collection */}
          <SourceFile path="lib.rs" externalUses={["axum::Router", "axum::routing::get"]}>
            <FunctionDeclaration name="router" returns="Router">
              Router::new()<Zone name="router" />
            </FunctionDeclaration>
          </SourceFile>
        </CrateDirectory>
      </ZoneProvider>
    </VisibilityContext.Provider>
  </Output>
);
```

This produces:

```
src/
  lib.rs
  models.rs                    # User + Post in one file
  routes/
    mod.rs                     # pub mod list_users_auto; pub mod list_users; ...
    list_users_auto.rs         # axum handler, regenerated
    list_users.rs              # domain stub, yours to edit
    get_user_auto.rs
    get_user.rs
```

`models.rs`:
```rust
use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
  pub id: i64,
  pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Post {
  pub id: i64,
  pub title: String,
}
```

`list_users_auto.rs`:
```rust
use axum::Json;

use crate::models::User;

pub async fn list_users() -> Json<Vec<User>> {
  Json(crate::routes::list_users::list_users_impl().await)
}
```

`list_users.rs`:
```rust
pub async fn list_users_impl() -> Vec<User> {
  todo!()
}
```

`lib.rs` collects routes from all endpoints via the `<Zone>`:
```rust
pub mod models;
pub mod routes;

use axum::Router;
use axum::routing::get;

pub fn router() -> Router {
  Router::new()
    .route("/users", get(routes::list_users_auto::list_users))
    .route("/users/:id", get(routes::get_user_auto::get_user))
}
```

### Single file with `<AxumEndpoint>`

Uses `ReplaceFile` with auto/manual zones in one file. On re-emit, auto zones are replaced while manual zones are preserved from the existing file on disk.

```tsx
<AxumEndpoint
  name="list_users"
  path="/users"
  method="get"
  routePath="routes::list_users"
  responseModel={userKey}
  responseList
  existingFile="/path/to/existing/list_users.rs"  // optional: preserves manual zones
/>
```

Produces a single `list_users.rs` with zone sigils:

```rust
// alloy-handler-start
pub async fn list_users() -> Json<Vec<User>> {
  Json(list_users_impl().await)
}
// alloy-handler-end

// manual zone below -- your code survives re-generation
pub async fn list_users_impl() -> Vec<User> {
  todo!()
}
```

## How to: file and module structure

Three components control the crate layout. Everything nests.

### `<CrateDirectory>` -- crate root

Creates the root scope. All `use crate::` paths resolve relative to this.

```tsx
<CrateDirectory>
  <SourceFile path="lib.rs" />   {/* or main.rs */}
  {/* children become the crate contents */}
</CrateDirectory>
```

### `<ModDirectory>` -- module with auto mod.rs

Creates a directory with an auto-generated `mod.rs`. Any `<SourceFile>` inside it gets a `pub mod` entry in `mod.rs`. Use this when a module genuinely needs multiple files (e.g. routes with auto/manual pairs). For a bag of related types, prefer a single `<SourceFile>` instead.

```tsx
{/* Routes need separate files (auto/manual split), so ModDirectory fits */}
<ModDirectory name="routes">
  <SourceFile path="list_users_auto.rs" .../>
  <SourceFile path="list_users.rs" .../>
</ModDirectory>

{/* Models are just declarations -- one file is cleaner */}
<SourceFile path="models.rs" ...>
  <StructDeclaration name="User" .../>
  <StructDeclaration name="Post" .../>
</SourceFile>
```

### `<SourceFile>` -- .rs file with use management

Handles two categories of imports separately:

- **`externalUses`** prop: explicit external crate imports (`serde::Serialize`, `chrono::Utc`, etc.)
- **Cross-file references**: when a `<Reference refkey={...} />` points to a declaration in another file, the `use crate::` import is generated and grouped automatically

```tsx
<SourceFile path="handler.rs" externalUses={["axum::Json", "axum::extract::Path"]}>
  {/* declarations and references here */}
</SourceFile>
```

Produces:

```rust
use axum::Json;
use axum::extract::Path;

use crate::models::user::User;    // auto-generated from Reference

// ... declarations
```

External uses are sorted alphabetically. Crate uses appear after a blank line separator.

### Cross-file references with `refkey`

The `refkey()` function creates a stable identifier. Assign it when declaring a type, reference it from anywhere else in the tree. The framework resolves the correct `use crate::` path.

```tsx
const userKey = refkey();

// In models.rs
<StructDeclaration name="User" refkey={userKey} ...>

// In routes/handler.rs -- auto-generates: use crate::models::User;
<FunctionDeclaration returns={<>Json&lt;Vec&lt;<Reference refkey={userKey} />&gt;&gt;</>} ...>
```

References within the same file resolve directly (no `use` needed). References across files produce `use crate::` imports automatically.

### Append zones for collection patterns

`<Zone>` renders collected content. `<AppendTo>` teleports content into a named zone from anywhere in the tree. Useful for router registration, plugin lists, or any pattern where multiple components contribute to a single output location.

```tsx
<ZoneProvider>
  {/* Zone renders here */}
  <SourceFile path="lib.rs">
    <FunctionDeclaration name="router" returns="Router">
      Router::new()<Zone name="router" />
    </FunctionDeclaration>
  </SourceFile>

  {/* These can be anywhere in the tree */}
  <AppendTo zone="router">
    {"\n"}.route("/users", get(routes::users::list_users))
  </AppendTo>
  <AppendTo zone="router">
    {"\n"}.route("/posts", get(routes::posts::list_posts))
  </AppendTo>
</ZoneProvider>
```

## Multi-transport bindings

Endpoints can bind to multiple transports from the same operation definition. Each transport has an exhaustive extraction matrix:

| Param source | HTTP (axum) | WebSocket |
|---|---|---|
| `path` | `Path(name): Path<T>` | `name: T` |
| `query` | `Query(name): Query<T>` | `name: T` |
| `body` | `Json(name): Json<T>` | `name: T` |
| `header` | `name: HeaderMap` | `name: T` |
| resolved (per-request) | `Extension(name): Extension<T>` | `conn.extensions().get::<T>()` |
| resolved (shared) | `State(name): State<T>` | `conn.state::<T>()` |

The domain function stays the same. Only the transport wrappers differ.

## Running tests

```bash
pnpm test              # snapshot tests only
pnpm test:cargo        # also runs cargo check on generated crates (slower)
```
