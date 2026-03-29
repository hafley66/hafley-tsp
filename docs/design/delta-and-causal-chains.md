# Delta as Universal Primitive & Causal Chain Design

Date: 2026-03-28
Context: Multi-agent consultation (2x haiku, 2x sonnet, 1x opus) on event chain modeling, trigger unification, and production gaps.

## Background

Starting point: two coexisting trigger systems in the namespace convention.
- `@timingBefore/After/On(op)` -- bind effect to a specific operation
- `@onChange(Model, "field")` -- bind effect to field-level state transitions

Core tension: effects sometimes care about WHAT changed (field value), sometimes WHY it changed (which op, which chain of ops). These are different questions answered by different trigger systems. The "everything is an event" observation means every function call, field write, and construction is an event -- the language picks a cut point for visibility. Different emitter targets want different cut points.

---

## 1. Delta as First-Class Type (Opus synthesis, confirmed by all agents)

Every mutation produces a typed delta. The compiler generates it mechanically from each model + its `mut/` operations.

```
// compiler-generated from Todo model + mut/ namespace
Delta<Todo, "update"> = {
  op: "update"
  fields: {
    status?: { from: Status, to: Status }
    assignee?: { from: string | null, to: string }
    // ... every mutable field
  }
}
```

Both trigger systems collapse into pattern matching on the delta:

```
// what @timingAfter(mut.create) really means:
@on(Delta<Todo> { op: "create" })

// what @onChange(Todo, "status") really means:
@on(Delta<Todo> { field: "status" })

// provenance-aware (currently inexpressible):
@on(Delta<Todo> { field: "status", to: Status.done, op: "complete" })

// wildcard on cause, specific on field+value:
@on(Delta<Todo> { field: "status", to: Status.done })
```

Why this works:
- Provenance comes free -- the delta carries the cause (which op)
- Emitter projection is a filter over deltas at preferred granularity
- One mechanism instead of two, with the old decorators as sugar
- The delta is always produced; triggers select which dimensions they match

---

## 2. Causal Chain Inference (from local declarations)

Authors declare local cause-effect pairs. The compiler stitches global chains by walking the declaration graph. `@scope("same"/"independent")` marks transaction boundaries.

Chain example:
```
User.mut.deactivate
  →same→ archiveUserLists (side effect)
    →same→ List.mut.delete
      →same→ cascadeDeleteTodos (side effect)
        →independent→ cleanupAttachments (async, own tx)
```

The compiler answers: "if cleanupAttachments fails, does User.deactivate roll back?" No -- the `independent` scope boundary isolates it.

### Causal chain levels (from insane to pragmatic)

**Full insanity (rejected):** Chain types as runtime values, pattern matching on chain shapes, tree-shaped chain types, runtime propagation.

**Less insane (current design):** Compiler has the full graph statically. Authors declare local pairs + scope. Emitter generates correlation IDs, transaction scoping, compensation code. No chain types at authoring level.

**The one upgrade that matters:** The delta carries the op that caused it. If the emitter needs deeper provenance (what caused the op that caused this), it generates correlation IDs that link deltas into chains at runtime. The chain is data, not types.

---

## 3. Hard Compiler Problems

### 3a. Diamond problem (convergence)

Two ops mutate the same field in the same transaction. Which @onChange fires first? Are they commutative?

The compiler must:
- Detect convergence nodes (multiple ops feeding same delta trigger)
- Either enforce a topological ordering or require `@commutative` annotation
- Error if two non-commutative effects with `@scope("same")` converge

### 3b. Cycles

```
OpA → effect mutates FieldX → @onChange triggers OpB → effect mutates FieldY → @onChange triggers OpA
```

Without detection: infinite loop in generated code.

Options:
- Static cycle rejection (reject any declaration graph with cycles)
- `@maxDepth(n)` annotation allowing bounded recursion
- `@idempotent` annotation + runtime duplicate detection

Recommendation from agents: static rejection as default, `@maxDepth` as escape hatch.

### 3c. Effect-effect ordering

Two `@scope("same")` effects in the same transaction, one mutates a field the other watches. Execution order is undefined in current design.

This is the "effect-effect dependency ordering problem" (NP-hard to solve optimally without restricting the graph). Practical solution: topological sort on the delta dependency graph within a transaction scope, error on ambiguous ordering.

---

## 4. Production Gaps

Things the emitter needs that the model is currently silent on.

### 4a. Idempotency keys

`@timingOn` (async) + retries = duplicate effects. Model needs dedup key declaration.

```
@on(Delta<Todo> { op: "create" }, idempotencyKey: "id")
op notifyListOwner(todo: Todo): void;
```

The emitter generates dedup store lookup. Without the key, it can't generate correct code.

### 4b. Partition keys / ordering

Event ordering is per-entity-id, not global. Without a partition key, the emitter either generates a global ordered queue (wrong, doesn't scale) or unordered (wrong, races on same entity).

```
@on(Delta<Todo> { field: "status" }, partitionKey: "id")
op onStatusChange(prev: Todo, next: Todo): void;
```

### 4c. Batch atomicity

`createBatch` + `@onChange` = N deltas. Is the batch atomic (all or nothing) or best-effort (partial success)?

Need: `@atomic` on batch ops, or a batch-level delta type that wraps N individual deltas.

### 4d. Schema versioning

In-flight events serialized under V1 when handlers expect V2. Options:
- Version-routed handlers (verbose, explicit)
- Upcaster chain: compiler generates `V1 → V2` from model field diffs + `@since`/`@deprecated` annotations
- Flow `Self` checkpoints need migration paths between versions

### 4e. Dead letter / retry policy

Every async effect needs DLQ config. Currently not declarable.

```
@on(Delta<Todo> { op: "create" }, retries: 3, backoff: "exponential", dlq: true)
op notifyListOwner(todo: Todo): void;
```

### 4f. Outbox pattern

"Write entity + emit event atomically" requires transactional outbox. The emitter should generate an `_outbox` table + poller for `@timingOn` effects that need exactly-once delivery. The model needs a flag indicating which effects need outbox semantics vs fire-and-forget.

---

## 5. Four Orthogonal Primitives (Haiku-scope synthesis)

Minimal set that covers real-world cases:

| Dimension    | Values                          |
|--------------|---------------------------------|
| Timing       | sync, async                     |
| Scope        | same, independent               |
| FailureMode  | rollback, compensate, log       |
| Compensating | optional ref to inverse op      |

Everything else (transaction boundaries, retry behavior, rollback strategy) derives from these four dimensions + the chain graph.

`@before`/`@after` = sync + same scope.
`@on` = async + independent scope.
`@compensates(op)` = declares the inverse operation for saga rollback.

---

## 6. Formal Foundations (Sonnet-PL)

Existing PL concepts that map onto this problem:

| Concept | Maps to |
|---------|---------|
| Algebraic effects + handlers | Operation-level triggers. Each op has an effect signature. Handlers are delimited continuations at scope boundaries. |
| Refinement types | Field-level triggers. `@onChange` handlers take values in a refined type `{v: T \| v.field changed}`. |
| Coeffects (Petricek 2014) | Provenance threading. The handler's behavior depends on causal context (a coeffect), not just current state. |
| Linear types on tx tokens | Scope enforcement. A linear transaction token consumed exactly once (commit/rollback). Passing across `@scope("independent")` = type error. |
| Join calculus (Fournet/Gonthier 1996) | Convergence nodes. `@onChange` is a join pattern with a single port accepting from any writing process. |
| Process calculi (pi-calculus) | `@scope("independent")` spawns a new process/channel. Dynamic process creation for async boundaries. |

Minimal formal core (phase ordering):
1. Effect inference (propagate op effect rows upward through chains)
2. Join graph construction (all @onChange bindings → convergence nodes)
3. Coeffect propagation (thread provenance through the graph)
4. Linearity check (transaction token usage across scope boundaries)

Hardest formal problem: provenance + convergence together. Multiple ops converge on a handler, each with different provenance. The handler's coeffect type must be the join (LUB) in the provenance lattice. If handler behavior is provenance-dependent, provenance can't be fully erased at compile time.

---

## 7. Architectural Suggestions

### 7a. Merge `side/` and `flow/` (Opus)

A side effect is a single-step flow. A flow is a multi-step chain of effects. Same mechanism at different scales. Consider one namespace (`react/` or `effect/`) where the compiler distinguishes single-step from multi-step by type signature.

Counter-argument: `flow/` has `Input/Self/Yield/Next` coroutine semantics that don't apply to single-step effects. Keeping them separate may be clearer for authors.

### 7b. Enrich `deps/` with lifecycle coupling (Opus)

Currently `deps/` says "this entity references that one." Should express:
- **owns** (cascade delete, same lifecycle)
- **references** (nullable FK, independent lifecycle)
- **correlates** (soft reference, no FK, observational)

These three have different transaction boundary and compensation implications.

### 7c. Separate command vs event layer (Haiku-events)

The design conflates command semantics (op intends to mutate) with event semantics (mutation happened). They're different:
- A command can fail or be rejected. Effects are conditional.
- An event is immutable fact. Effects on events are certain.

`@timingBefore` = command validation (can reject).
`@timingAfter`/`@onChange` = event reaction (already happened).

Making this distinction explicit helps the compiler reason about which effects are conditional.

### 7d. External/bypass mutations (Haiku-events)

What if something mutates the database directly, bypassing ops? Do @onChange handlers fire?

Two classes of mutations: operation-induced vs external. The causal chain is incomplete for external mutations. Either:
- Accept the gap (ops are the contract, bypass is unsupported)
- Model it: `@onChange` can receive `cause: DirectMutation` as a provenance value, handlers must handle "unknown cause"

---

## 8. The One-Move Simplification

If the delta becomes a first-class authored type, three things collapse:

1. **Trigger unification** -- one system instead of two, old decorators become sugar
2. **Provenance** -- carried in the delta, not inferred from chain walking
3. **Emitter projection** -- each emitter filters the delta stream at its preferred granularity

The namespace skeleton and scope annotations remain as-is. The delta is the minimum viable addition that unlocks the most design space.

---

## Raw Agent Feedback

### Haiku Agent 1: Event Chain Modeling

Key contributions:
- Diamond problem in convergence nodes: need mutation origin tag as dependent type `FieldChange<Model, "field", causedBy: Op>`
- Time paradoxes in scope boundaries: effect-effect ordering within same transaction is undefined and NP-hard to solve optimally
- Compensation requires explicit markers (`@compensate`, `@idempotent`, `@sideEffectFree`), can't be inferred
- Polymorphic operations `Op<T>` explode convergence node complexity with qualified convergence
- Retroactive cause insertion: direct DB mutations bypass the op layer, breaking causal chain completeness
- Alternative framing: declare effects as pure data (not tied to ops), declare op-effect bridges separately, let compiler build graph
- Causality as first-class value: `event FieldChanged<T, F> { oldValue, newValue, causedBy, timestamp, transactionId }` with `Handler<T, F> = (FieldChanged<T, F>) => IO ()`

### Haiku Agent 2: Scope and Transaction Semantics

Key contributions:
- Binary scope (same/independent) is sufficient, avoid gradations
- Timing is orthogonal to scope and should be explicit
- Four-dimension minimal primitive set: Timing, Scope, FailureMode, CompensatingOp
- Compensation via explicit `compensatingOp` per effect, compiler walks backward on failure
- Circularity: static DAG check, reject cycles unless marked `@idempotent(maxDepth)`
- Partial fan-out failure: `failureMode: log | compensate | rollback` per effect
- Clarification needed: make timing and scope explicit in the decorator, co-locate compensatingOp

### Sonnet Agent 1: PL Theory

Key contributions:
- Operation-level triggers = effect labels (algebraic effects). Field-level triggers = refinement predicates. Two different type-theoretic layers, coherent that they coexist.
- Causal chains = free monad chaining / monadic composition of effects
- `@scope` = placement of the effect handler (deep handler = same scope, shallow handler = independent scope)
- Provenance = coeffects (Petricek, Orchard, Mycroft 2014). Context annotation flows through chain as semiring element.
- Linear/affine types on transaction tokens. Passing token across `@scope("independent")` = type error.
- Convergence = join calculus (Fournet/Gonthier 1996). `@onChange` is a join pattern with single port.
- Formal phase ordering: effect inference → join graph construction → coeffect propagation → linearity check
- Hardest formal problem: provenance + convergence. Multiple ops converge with different provenance, handler coeffect type = LUB in provenance lattice.

### Sonnet Agent 2: Practitioner / Distributed Systems

Key contributions:
- Field-reactive side effects map cleanly to event sourcing update-event pattern. prev/next signature is correct.
- `@before/@after/@on` split correctly names the distinction between domain events and transactional hooks
- Idempotency keys change the type, not just a flag. Need dedup key in payload + dedup store.
- Ordered delivery is entity-scoped (partition key per entity id), not global or op-scoped.
- `@after` same-tx is a lie at scale with distributed backends. Need hard-requirement flag or compile error for non-transactional targets.
- Batch + @onChange interaction is undefined. Need atomic vs best-effort declaration.
- Flow steps have no error lanes. `Self` captures outputs but not error states. Need error accumulator.
- Compensation: `@compensates(op)` mirroring mut/ operations. Flow `Self` checkpoints = compensation cursor.
- Schema versioning: upcaster chain from model field diffs vs version-routed handlers. In-flight `Self` checkpoints need migration.
- Emitter must generate: DLQ config, outbox tables, schema registry entries, partition keys. All currently implicit.

### Opus Agent: Synthesis and Gaps

Key contributions:
- Namespace convention is the strongest part. Lifecycle-intent grouping = semantic index for compiler.
- Design is over-committed to effects as primary composition, under-committed to data flow as primary reasoning.
- Missing abstraction: transition = function from (cause, prior state) to (next state, effects). Trigger systems describe WHEN but not the data path from cause through state change to effect.
- **Unifying move: `transition` as pattern match on delta.** Both trigger systems are special cases of matching on `{ op, field, from, to }`. Delta is the universal event.
- `deps/` should express cardinality and lifecycle coupling: owns / references / correlates.
- `side/` and `flow/` are same mechanism at different scales. Consider merging.
- Emitter cut points are configuration, not language concern. Language produces full delta graph, emitter projects.
- Minimum viable: namespace convention + delta-based triggers + scope annotation. Drop chain types, compensation DSL, flow as separate concept for now.
