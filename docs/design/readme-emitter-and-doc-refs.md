# README Emitter, Target-Lang Docs, Deep Paths, and Doc References

Design session 2026-03-24. Three emitter targets + a doc-reference decorator, all feeding from the same `TypeDef[]` neutral representation.

## Core Insight

The adapter (`packages/rust/src/adapters/00_typespec-to-neutral.ts`) already defines `doc?: string` on `ModelDef`, `EnumDef`, `ModelProperty`, and `EnumMember` -- but `convertModel()` and `convertEnum()` never extract it from the TypeSpec AST. Wiring that single field unlocks everything below.

## 1. README Emitter (Markdown Per Directory)

Emit a README.md (or append to an existing one) in every directory where `.tsp` files live. The filesystem is the outline -- no restructuring, just projection.

### Behavior

- Walk `TypeDef[]`, group by source file directory
- For each directory:
  - If README.md exists, preserve content above `<!-- tsp:generated -->` marker
  - Emit/replace everything below the marker
- Models render as tables (property name, type, doc)
- Enums render as lists (member name, value, doc)
- `doc` strings become prose paragraphs above the table/list

### Example Output

```markdown
## Order

Ships to the customer's primary address.

| Property | Type | Description |
|----------|------|-------------|
| customer | [Customer](#customer) | Buyer details |
| items | Item[] | Line items |

## Status

| Member | Value |
|--------|-------|
| Pending | "pending" |
| Shipped | "shipped" |
```

### Type Signatures

```ts
function emitModelSection(model: ModelDef): string
function emitEnumSection(enum_: EnumDef): string
function emitReadme(types: TypeDef[], existingContent?: string): string
```

## 2. Target-Language Doc Comments

The neutral `doc` field flows through to each language emitter's native doc comment syntax. No new emitter needed -- existing emitters just read the field they already declare.

| Language | Syntax |
|----------|--------|
| Rust | `/// doc` above struct/field |
| TypeScript | `/** doc */` above interface/property |
| Python | `"""doc"""` docstring |
| C# | `/// <summary>doc</summary>` |

The Rust emitter (`packages/rust/src/emitter/02_emit-model.tsx`) would prepend `///` lines when `doc` is present. Same pattern for any future language emitter.

## 3. Deep Path Enumeration + Decorator-Filtered Match Arms

Given a model graph, enumerate all lodash-style deep paths (like react-hook-form paths).

### Example

```typespec
model Order {
  customer: Customer;
  items: Item[];
}
model Customer { name: string; address: Address; }
model Address { street: string; city: string; }
```

Produces:

```
"customer"
"customer.name"
"customer.address"
"customer.address.street"
"customer.address.city"
"items"
"items[number]"
"items[number].name"
```

### Decorator Filtering

Mark properties with domain decorators (`@indexed`, `@searchable`, `@redacted`, etc.) and the path enumerator yields only the matching subset. The match arm emitter guarantees exhaustiveness over that subset.

```rust
// Filtered by @indexed
match path {
    "customer.name" => { /* ... */ }
    "customer.address.city" => { /* ... */ }
}
```

### Type Signatures

```ts
interface DeepPath {
  path: string;                          // "customer.address.street"
  segments: string[];                    // ["customer", "address", "street"]
  terminalType: ModelProperty["type"];
  decorators?: string[];                 // decorators on the terminal property
}

function enumeratePaths(
  root: ModelDef,
  allTypes: Map<string, TypeDef>,
  options?: { maxDepth?: number; filterDecorator?: string }
): DeepPath[]
```

## 4. Doc References -- Typed Holes in Doc Strings

A decorator that accepts doc strings with model references that resolve per-language.

### TypeSpec Authoring

```typespec
@doc("Ships to the {Customer}'s primary {Address}")
model Order {
  customer: Customer;
  items: Item[];
}
```

`{Customer}` and `{Address}` are not string interpolation -- they are typed references into the type graph.

### Per-Language Resolution

| Target | `{Customer}` becomes |
|--------|---------------------|
| Rust | `` [`Customer`] `` (intra-doc link) |
| TypeScript | `{@link Customer}` |
| Python | `` :class:\`Customer\` `` |
| Markdown | `[Customer](#customer)` |
| C# | `<see cref="Customer"/>` |

### Deep Path References

Property paths also resolve:

```typespec
@doc("Validated against {Customer.address.city} geolookup")
model ShippingRate { ... }
```

In Rust: `` [`Customer::address::city`] ``. In Markdown: link to the property row in the Customer table.

### Neutral Representation

```ts
interface DocString {
  raw: string;                    // "Ships to the {Customer}'s primary {Address}"
  segments: DocSegment[];
}

type DocSegment =
  | { kind: "text"; value: string }
  | { kind: "ref"; name: string; def: TypeDef }
```

The adapter parses `{...}` tokens, resolves each against the type map, and hands downstream emitters structured docs instead of flat strings. Each language emitter implements:

```ts
renderDocRef(ref: DocSegment & { kind: "ref" }): string
```

For the README emitter, links are local anchors when both types live in the same directory's generated appendix, or relative path links when they're in different directories. The filesystem-as-outline means link topology mirrors namespace topology.

## Architecture Map

All three emitters + doc references share the same pipeline:

```
TypeSpec Program
      │
      ▼
  Adapter (programToTypeDefs)  ◄── wire doc extraction here
      │
      ▼
  TypeDef[] with DocString
      │
      ├──▶ README emitter (markdown per dir, co-located)
      ├──▶ Target-lang emitters (/// rustdoc, /** jsdoc */, etc.)
      └──▶ Deep path enumerator ──▶ match arm emitter
```

## Unresolved

- Should the doc reference syntax be `{Model}` or `{@link Model}` to avoid collisions with literal braces in doc strings?
- Deep path cycle detection for recursive models (model that references itself)
- Whether the README emitter should be its own package or live in a shared `packages/markdown/` emitter
- Appendix vs. full README generation as a per-directory config option
