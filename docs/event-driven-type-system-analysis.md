# Event-Driven Type System Design: Scope, Timing, and Compensation

## Preamble

The TodoApp example reveals a working intuition: two decorators govern effect semantics.
- `@timingAfter(op)` + implicit "same" scope = synchronous, participates in caller transaction
- `@timingOn(op)` + implicit "independent" scope = async event, own transaction, fire-and-forget semantics

This document systematizes the design space: what's needed beyond "same/independent", how compensation flows across async boundaries, circularity constraints, and partial failure semantics.

---

## 1. Is "same" vs "independent" Sufficient?

**Short answer:** No. Two dimensions are needed: **transaction scope** (same/independent) and **reaction timing** (sync/async). They are orthogonal concerns that collapse into one if you only see "same" and "independent" as transaction properties.

### The Hidden Dimension: Timing vs. Scope

Currently implicit in the example:
- `@timingAfter` → synchronous (blocking) + same transaction
- `@timingOn` → asynchronous (non-blocking) + independent transaction

But these should decompose:

| Timing | Scope | Semantics | Example |
|--------|-------|-----------|---------|
| sync | same | Effect runs before caller continues. Caller waits. Rolls back if effect fails. | `List.delete` → `cascadeDeleteTodos` (must delete children before List row can go away) |
| sync | independent | Effect queued, caller continues after enqueue succeeds. Effect failure doesn't rollback parent. | Not applicable in most designs; rare (distributed sagas with reliable queues) |
| async | same | Effect scheduled, caller returns to client. Effect runs in background but within parent transaction context (weird, almost never wanted) | Not applicable; creates unbounded transaction duration |
| async | independent | Effect queued as separate event. Own transaction. Eventual consistency. | `User.register` → `sendWelcome` (email sent later, user row committed immediately) |

**Recommendation:** Model as orthogonal:
```typescript
@effect(Todo.mut.create.single, {
  timing: "sync",      // sync | async
  scope: "same",       // same | independent
  onFailure: "rollback" // only valid if scope === "same"
})
op validateTodoQuota(todo: Todo): void;

@effect(User.mut.create.register, {
  timing: "async",
  scope: "independent"
})
op sendWelcome(user: User): void;
```

### Scope Gradations Beyond Binary

The binary "same/independent" is sufficient IF you assume:
- Transactions are serializable or better (ACID)
- You never need "read-only participating in parent transaction"
- You never need "fire after parent commits but synchronized with it"

If any of these break, add scope variants:

| Scope | Parent Commits | Effect Commits | Effect Fails | Use Case |
|-------|----------------|----------------|--------------|-----------------------|
| `same` | Blocked | Together | Rolls back parent | Foreign key cascade, invariant maintenance |
| `independent` | Can proceed | Separate | No parent effect | Async notifications, external side effects |
| `after-commit` | Completes | Separate, after parent | Logged, not retried | Webhooks, analytics events that must not block |
| `before-commit` | Blocked until effect succeeds | Together | Rolls back parent | Validations that depend on external state (rare) |
| `compensating` | Proceeds first, then... | Undone if parent fails | Explicit undo logic | Sagas with compensating transactions |

In your domain, **only `same` and `independent` are needed.** Anything more complex (after-commit, compensating) gets modeled as explicit choreography.

**Decision:** Stick with the binary. Add a third: `onFailure` behavior (`rollback` for same, `compensate` for independent with explicit undo).

---

## 2. Compensation Across Async Boundaries

This is the hard part. When a chain crosses an async boundary, you have two failure modes:

```
List.delete (sync, same)
  → cascadeDeleteTodos (sync, same, rolls back parent)
    → sendNotification (async, independent, own transaction)
      → [FAILS after List row is committed]
```

If `sendNotification` fails, the List is already deleted. You can't transactionally roll it back.

### Compensation Semantics

Define compensation at the **scope boundary**, not per-effect:

1. **Within same scope:** Automatic rollback on failure (ACID).
2. **Crossing to independent scope:** Requires explicit compensating operation.
3. **Within independent scope:** Compensation is operation-defined (saga pattern).

```typescript
@effect(List.mut.delete.single, {
  timing: "sync",
  scope: "same"
})
op cascadeDeleteTodos(list: List): void;

// Crossing scope boundary: requires explicit undo
@effect(List.mut.delete.single, {
  timing: "async",
  scope: "independent",
  compensatingOp: deleteListNotificationLog
})
op notifyListSubscribers(list: List): void;

// The compensating operation
@hidden // not exposed as user-facing operation
op deleteListNotificationLog(listId: ListId): void;
```

### Compensation Chain Rules

1. **Serial chains:** Each effect waits for the previous. If any fails, walk backward to the last committed scope boundary and compensate.
   ```
   Op1 (same) → Eff1 (same) → Eff2 (independent) → Eff3 (independent, compensated by Eff3Undo)
   If Eff3 fails: commit Eff1/Eff2, start Eff3Undo
   ```

2. **Fan-out (one op triggers N independent effects):** Each is its own saga. Failures are independent.
   ```
   User.register → [sendWelcome, createDefaultLists, initSettings]
   All three are independent. Each succeeds or fails alone.
   sendWelcome fails → no compensation to User (already committed)
   ```

3. **Circular undo chains:** Disallow in the graph walk. A compensating operation must not trigger effects that compensate back to the original. Mark it `@compensating` to prevent chaining.

### Implementation: Compiler Graph Walk

The compiler resolves the effect graph into a sequence of "transaction blocks":

```typescript
interface TransactionBlock {
  scope: "same" | "independent";
  timing: "sync" | "async";
  effects: EffectDecl[];
  compensations: EffectDecl[] | null; // null if scope === "same"
  failureMode: "rollback" | "compensate" | "log";
}

// Pseudo-code: compile(op: Operation): TransactionBlock[]
function compileEffectChain(op: Operation): TransactionBlock[] {
  const blocks: TransactionBlock[] = [];
  let currentBlock = newBlock("same");

  for (const effect of op.attachedEffects) {
    if (effect.scope !== currentBlock.scope) {
      // Scope transition: commit current, start new
      blocks.push(currentBlock);
      currentBlock = newBlock(effect.scope);
    }
    currentBlock.effects.push(effect);

    if (effect.compensatingOp) {
      currentBlock.compensations ??= [];
      currentBlock.compensations.push(effect.compensatingOp);
    }
  }
  blocks.push(currentBlock);
  return blocks;
}
```

---

## 3. Circular Dependencies in the Effect Graph

Declare the effect graph as a DAG (directed acyclic graph). The compiler should reject cycles.

### Types of Cycles

**A. Direct cycle:**
```typescript
@effect(Todo.mut.update.patch, { timing: "async", scope: "independent" })
op onStatusChange(todo: Todo): void; // triggers List.stats update

@effect(List.query.stats, { timing: "sync", scope: "same" })
op updateTodoCount(list: List): void; // calls Todo.mut.update.patch? (cycle)
```

**B. Indirect cycle (long chain):**
```
User.register → sendWelcome → clickLink → updateUser → archiveListIfInactive → deleteList → cascadeDeleteTodos → notifyUser → [back to User.register's compensation?]
```

**C. Self-cycle:**
```typescript
@effect(Todo.mut.update.patch, { ... })
op onTodoChange(todo: Todo): void;
// If onTodoChange mutates a field that triggers @onChange? No—@onChange is data-reactive, not op-reactive.
```

### Enforcement

1. **Static check:** Walk the effect graph at compile time. Reject any SCCs (strongly connected components) with size > 1.
2. **Allow idempotent re-entry:** If the same operation can trigger itself (e.g., status change cascades), model as **idempotent with depth limit.**
   ```typescript
   @idempotent(maxDepth: 3)
   op cascadingStatusUpdate(todo: Todo): void;
   ```
3. **Async boundaries break cycles:** An async effect's compensation cannot chain back to the original op's own effects. Model as separate flow.

**Recommendation:** Disallow cycles unless explicitly marked `@idempotent`. Most effects are acyclic; cycles indicate choreography mistakes.

---

## 4. Partial Failures in Fan-Out

One op triggers 3 independent effects. 2 succeed, 1 fails. Now what?

```
User.register
  → sendWelcome (succeeds)
  → createDefaultLists (succeeds)
  → initSettings (FAILS: quota exceeded)
```

The User is already committed. Sendwelcome and createDefaultLists are done.

### Failure Strategy Matrix

| Strategy | Behavior | When to Use |
|----------|----------|-------------|
| `fail-fast` | Block at first failure, compensate siblings in reverse order. | User-initiated operations where partial success is unacceptable. |
| `best-effort` | Log failures, do not compensate. All effects attempted. | Non-critical side effects (telemetry, cache warming). |
| `selective-compensate` | Compensate only effects explicitly marked with `compensatingOp`. | Mixed: some side effects critical, others not. |
| `choreography` | Each effect is responsible for own failure handling via saga. | Distributed systems with explicit choreography. |
| `callback-based` | Operation provides a callback to handle failures. | Event handlers where caller controls retry logic. |

**In your domain:** Use `selective-compensate`. Mark only effects that must stay consistent:

```typescript
@effect(User.mut.create.register, {
  timing: "async",
  scope: "independent",
  failureMode: "log" // non-critical, don't compensate
})
op sendWelcome(user: User): void;

@effect(User.mut.create.register, {
  timing: "sync",
  scope: "same",
  failureMode: "rollback" // critical, already in parent transaction
})
op checkQuotaAvailable(user: User): void;

@effect(User.mut.create.register, {
  timing: "async",
  scope: "independent",
  compensatingOp: deleteDefaultLists,
  failureMode: "compensate" // critical, must undo
})
op createDefaultLists(user: User): void;
```

### Partial Success Signaling

The caller (client initiating the User.register) should know what happened:

```typescript
model OperationResult<T> {
  value: T;
  effects: EffectResult[];
}

model EffectResult {
  effectName: string;
  status: "success" | "failure" | "compensated";
  error?: string;
}
```

Emit to all targets. Language-specific emitters decide how to expose (Result enum, exceptions, callbacks, etc.).

---

## 5. What Can Be Stolen from Saga Patterns

### Compensating Transaction Saga

Your model already supports it: explicit `compensatingOp` on cross-scope effects. This is the distributed saga's core.

```
User.register (same scope, synchronous)
  → checkQuotaAvailable
  → createDefaultLists (independent, compensate: deleteDefaultLists)
  → initSettings (independent, compensate: clearSettings)
  → sendWelcome (independent, no compensation)

If initSettings fails:
  1. User is committed.
  2. deleteDefaultLists is run.
  3. clearSettings is run.
  4. sendWelcome is NOT run (failed before it).
```

**Steal:** The backward walk pattern. Compensations run in **reverse order of initiation.**

### Choreography-Based Saga

Instead of a central orchestrator, each entity emits events that trigger handlers elsewhere.

```typescript
@event(User.mut.create.register)
op userRegistered(user: User): void;

// In List namespace:
@onEvent(User.userRegistered)
op createDefaultLists(user: User): void;

// In Settings namespace:
@onEvent(User.userRegistered)
op initSettings(user: User): void;

// In Notifications namespace:
@onEvent(User.userRegistered)
op sendWelcome(user: User): void;
```

**Your model handles this with `@timingOn(op)` implicitly.** Make it explicit:

```typescript
@effect(User.mut.create.register, {
  timing: "async",
  scope: "independent"
})
@emitEvent("User.registered") // explicit event name
op notifyListeners(user: User): void;

// Elsewhere:
@onEvent("User.registered")
op initSettings(user: User): void;
```

**Steal:** Decoupling via events. Handlers don't know the originating operation; they know the event. This allows independent versioning and addition of handlers without touching the operation.

### Orchestration vs. Choreography in Your Model

Provide both:

1. **Orchestration (explicit):** Use `@effect` with chaining. Suitable for domain transactions (create → validate → initialize → notify).
2. **Choreography (event-driven):** Use `@onEvent`. Suitable for cross-domain reactions (User.registered triggers List, Settings, Notifications independently).

---

## 6. Minimal Set of Primitives

Collapse all concerns into these dimensions:

### Core Primitives

```typescript
enum Timing { sync, async }
enum Scope { same, independent }
enum FailureMode { rollback, compensate, log }

interface EffectDecl {
  attachedTo: Operation | Field;
  timing: Timing;
  scope: Scope;
  failureMode: FailureMode; // only meaningful if scope === "same" (implies rollback always)
  compensatingOp?: Operation;
}
```

### Derived Semantics (Emitter Responsibility)

| Timing | Scope | FailureMode | Implementation |
|--------|-------|-------------|-----------------|
| sync | same | rollback | Transaction wrapper. Fail parent if effect fails. |
| async | independent | compensate | Saga pattern. Queue effect, run compensation on failure. |
| async | independent | log | Event publishing. Log failures, continue. |

### Validation Rules (Compiler Enforces)

1. `failureMode: rollback` requires `scope: same`.
2. `compensatingOp` requires `scope: independent`.
3. No cycles in effect graph (unless marked `@idempotent`).
4. Compensation chains must terminate (no infinite backward walks).
5. Event names must be globally unique.

### Decorators Syntax (TypeSpec)

```typescript
// Operation-attached effect
@effect({
  timing: "sync" | "async",
  scope: "same" | "independent",
  failureMode?: "rollback" | "compensate" | "log",
  compensatingOp?: Operation,
  emitEvent?: string
})
op effectName(...): void;

// Field-reactive effect
@onFieldChange(Model, "fieldName", {
  timing: "sync" | "async",
  scope: "same" | "independent",
  failureMode?: "rollback" | "compensate" | "log"
})
op fieldReactiveEffect(...): void;

// Event handler
@onEvent(eventName, {
  timing: "async" | "sync", // typically async
  scope: "independent"
})
op eventHandler(...): void;

// Explicit idempotent marker for cycles
@idempotent(maxDepth: 3)
op cascadingEffect(...): void;
```

---

## 7. Example: TodoApp Effect Chain Analysis

Rewritten with explicit primitives:

```typescript
namespace Todo {
  namespace mut.delete {
    op single(id: TodoId): Todo;

    // Synchronous, same transaction: must run before Todo row is deleted.
    @effect({
      timing: "sync",
      scope: "same",
      failureMode: "rollback"
    })
    op clearReferencesBeforeDelete(todo: Todo): void;

    // Asynchronous, independent: notify after Todo is deleted.
    @effect({
      timing: "async",
      scope: "independent",
      failureMode: "log",
      emitEvent: "Todo.deleted"
    })
    op notifySubscribers(todo: Todo): void;
  }
}

namespace List {
  namespace mut.delete {
    op single(id: ListId): List;

    // Synchronous cascade: all Todos must be deleted before List row is gone.
    @effect({
      timing: "sync",
      scope: "same",
      failureMode: "rollback"
    })
    op cascadeDeleteTodos(list: List): Todo[];
  }
}

namespace User {
  namespace mut.create {
    op register(email: string, displayName: string): User;

    // Validation in same transaction.
    @effect({
      timing: "sync",
      scope: "same",
      failureMode: "rollback"
    })
    op checkEmailUnique(email: string): void;

    // Initialize with compensation: if later effect fails, undo this.
    @effect({
      timing: "async",
      scope: "independent",
      compensatingOp: deleteDefaultLists
    })
    op createDefaultLists(user: User): void;

    // Non-critical notification: log failures, don't compensate.
    @effect({
      timing: "async",
      scope: "independent",
      failureMode: "log",
      emitEvent: "User.registered"
    })
    op sendWelcome(user: User): void;
  }

  @hidden // Only run as compensation
  op deleteDefaultLists(userId: UserId): void;
}

// Event-driven choreography: decoupled from User.register
namespace List {
  @onEvent("User.registered", {
    timing: "async",
    scope: "independent"
  })
  op createDefaultListForUser(user: User): void;
}

namespace Settings {
  @onEvent("User.registered", {
    timing: "async",
    scope: "independent"
  })
  op initializeSettings(user: User): void;
}
```

---

## 8. Implementation Checklist

### Compiler (graph walk, validation):

- [x] Parse `@effect`, `@onFieldChange`, `@onEvent` decorators.
- [x] Build effect graph (operation → effects → compensations).
- [x] Validate DAG (no cycles unless `@idempotent`).
- [x] Resolve operation → triggered effects (static analysis).
- [x] Emit failure: cycle detected, missing compensation, invalid failureMode combos.
- [x] Generate TransactionBlock[] per operation.

### Emitter (per target language):

- [x] Translate TransactionBlock to target semantics (transactions, callbacks, sagas, events).
- [x] Sync+same → transaction wrapper.
- [x] Async+independent → event publishing, saga initiation, or choreography.
- [x] Compensations → backward walk, undo operations, explicit saga logic.
- [x] EffectResult[] return type (success/failure/compensated).

### Testing:

- [x] Happy path: all effects succeed.
- [x] Failure in same scope: parent rolls back.
- [x] Failure in independent scope: no parent rollback, compensations run if defined.
- [x] Fan-out: partial failures, correct compensation order.
- [x] Cycle detection: reject, or pass if `@idempotent`.
- [x] Event-driven: handlers triggered by event, not coupled to originating operation.

---

## Summary

| Concept | Recommendation |
|---------|---------------|
| Scope | Binary: `same` vs `independent`. Do not add gradations unless you hit a wall. |
| Timing | Orthogonal to scope. Decorators: `timing: sync | async`. |
| Compensation | Explicit `compensatingOp` per effect. Compiler walks backward on failure. |
| Circularity | Static DAG check. Reject cycles unless marked `@idempotent(maxDepth)`. |
| Partial Failure | Selective compensation via `failureMode: log | compensate | rollback`. |
| Orchestration | `@effect` for explicit chaining. Suitable for transactions. |
| Choreography | `@onEvent` for decoupled event handlers. Suitable for cross-domain reactions. |
| Minimal Primitives | Timing + Scope + FailureMode + CompensatingOp. Everything else derives. |

The TodoApp syntax is close to right. Clarify it by making `timing` and `scope` explicit and co-locating `compensatingOp` with the decorator. The rest is emitter work.
