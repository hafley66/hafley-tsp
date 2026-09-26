# Monomorphization Engine: Cross-Language Stateful RPC via TSP & Sprefa

**Date:** 2025-04-04  
**Authors:** Gemini 4, Kimi 2.5 (see Appendix A for turn-by-turn attribution)

---

## Executive Summary

This document describes a system for seamless cross-language stateful RPC/coroutine monomorphization using TypeSpec (TSP) as the single source of truth and Sprefa as the static dependency graph engine. The architecture enables zero-cost refactoring, live multiplayer editing visualization, and static blast radius analysis for complex polyglot systems.

## 1. The Core Idea: Stateful Coroutine Bridge

### 1.1 Problem Space
Traditional cross-language bridges suffer from:
- Manual type synchronization (JSON ↔ Rust structs ↔ TypeScript interfaces)
- Runtime translation overhead
- No static guarantees when refactoring
- High cost of renaming/moving code across language boundaries

### 1.2 Solution: Monomorphized State Machines
Model stateful coroutines as **state machines** in TSP, not as RPC endpoints:

```tsp
model SessionState {
  session_id: string;
  cursor: int64;
  // Other state variables
}

enum CoroutineEvent {
  yield_to_host: { data: string };
  resume_from_host: { data: string };
  terminate: {};
}

op resume_coroutine(@body event: CoroutineEvent): SessionState;
```

**Key Innovation:** Use **Resolved Params** (types that carry their own extraction logic) for coroutine handles:

```tsp
op manage_coroutine(handle: CoroutineHandle, @body event: Event): State;
```

- **Rust:** `CoroutineHandle` implements `FromRequestParts`
- **JS:** `CoroutineHandle` maps to a worker instance
- **Go:** `CoroutineHandle` maps to a goroutine channel

## 2. Sprefa Integration: The Static Graph Engine

### 2.1 Schema Extensions for TSP Symbols

Add to Sprefa's SQLite schema:

```sql
-- TSP symbols (the source of truth)
CREATE TABLE tsp_symbols (
    id INTEGER PRIMARY KEY,
    refkey TEXT UNIQUE,  -- "src.api.users.user_id_.customer_id"
    file_id INTEGER,     -- FK to files table
    span_start INTEGER,    -- Byte offset in .tsp file
    span_end INTEGER,
    symbol_type TEXT,      -- "model", "op", "enum_variant", "field"
    template_args TEXT     -- JSON: ["TProps", "TState"]
);

-- Emitted file dependencies on TSP symbols
CREATE TABLE tsp_deps (
    id INTEGER PRIMARY KEY,
    symbol_id INTEGER,       -- FK to tsp_symbols
    emitted_file_id INTEGER, -- FK to refs.file_id
    dep_type TEXT,           -- "type", "field", "event", "route_param"
    line INTEGER,
    col INTEGER,
    FOREIGN KEY (symbol_id) REFERENCES tsp_symbols(id),
    FOREIGN KEY (emitted_file_id) REFERENCES refs(file_id)
);
```

### 2.2 TSP Symbol Extractor

New Sprefa extractor at `crates/extract/src/tsp.rs`:

```rust
pub fn extract_tsp_symbols(path: &Path) -> Vec<TspSymbol> {
    // Call TSP compiler with --dump-symbols flag
    // Returns: symbol refkeys, spans, types, template args
    // Even lightweight parsing gives us the refkey graph
}
```

When `sprefa scan` runs, it populates `tsp_symbols` and `tsp_deps`, creating a unified graph: **TSP symbols → emitted files → manual files → library dependencies**.

### 2.3 Incremental Symbol Diffing

In `crates/watch/src/watcher.rs`, monitor TSP compiler output:

```rust
pub async fn on_tsp_compile_done(&mut self, changed_tsp_files: &[PathBuf]) -> Result<ExecutionPlan> {
    let mut plan = ExecutionPlan::new();
    
    // Query: which symbols in changed .tsp files have downstream deps?
    let changed_symbols = self.db.query_tsp_symbols_in_files(changed_tsp_files);
    
    for symbol in changed_symbols {
        let deps = self.db.query_tsp_deps(symbol.id);
        for dep in deps {
            plan.mark_for_rebuild(dep.emitted_file_id);
        }
    }
    
    // Re-run emitter ONLY for stale files (incremental build)
    plan.execute().await
}
```

**This is `cargo check` for TSP symbols, not just Rust modules.**

## 3. Live Refactoring: Static Blast Radius

### 3.1 The "Blast Radius" Query

Built-in Sprefa command:

```bash
$ sprefa blast-radius --symbol src.api.users.user_id_.customer_id
```

SQL implementation:

```sql
WITH RECURSIVE symbol_deps AS (
  -- Direct deps: emitted files that reference this symbol
  SELECT emitted_file_id, symbol_id, 1 as depth
  FROM tsp_deps
  WHERE symbol_id = (SELECT id FROM tsp_symbols WHERE refkey = ?)
  
  UNION ALL
  
  -- Indirect deps: if an emitted file defines another TSP symbol, include its deps too
  SELECT d.emitted_file_id, d.symbol_id, sd.depth + 1
  FROM tsp_deps d
  JOIN tsp_symbols s ON s.id = d.symbol_id
  JOIN symbol_deps sd ON sd.emitted_file_id = s.file_id
  WHERE sd.depth < 5
)
SELECT 
    f.path as emitted_file,
    s.refkey as symbol,
    sd.depth,
    r.byte_start,
    r.byte_end,
    m.rule_name as source_rule
FROM symbol_deps sd
JOIN tsp_symbols s ON s.id = sd.symbol_id
JOIN refs r ON r.file_id = sd.emitted_file_id
JOIN matches m ON m.ref_id = r.id
JOIN files f ON f.id = r.file_id;
```

**Output:**

```
Emitted File                        | Symbol                              | Depth | Offset  | Source Rule
------------------------------------|-------------------------------------|-------|---------|--------------
src/routes/user_id_/index_auto.rs   | src.api.users.user_id_.customer_id  | 1     | 1024    | tsp_extract
src/api/billing/verify_auto.rs     | src.api.billing.verify.user_id      | 2     | 2048    | tsp_extract
out/react/user_detail.tsx          | src.api.users.user_id_.UserState    | 3     | 3072    | react_emitter
src/manual/auth.rs                 | hardcoded "user_id"                 | -     | 4096    | string_literal
```

Depth 1 = direct emit, Depth 2+ = transitive dependencies, Depth - = blocking conflict.

### 3.2 Reflexive Rename Loop

When you rename a symbol in **any** file (manual or auto):

1. **Sprefa watch** detects change via filesystem event
2. **Extractor** (Rust/TS/TSP) identifies the rename span
3. **SQL query** finds the TSP symbol refkey that generated it
4. **Automated edit** applies rename to the TSP source file
5. **TSP compiler** runs incrementally, emits `SymbolDelta`
6. **Sprefa** rebuilds affected files and shows final diff

**Time to rename across 5 languages: <1 second, fully static.**

## 4. Practical Scenarios

### 4.1 The Language Bridge (JS ↔ Rust)
**Scenario:** CLI tool in Go needs to call high-performance Rust core.  
**Win:** Define `Command` enum in TSP. Emitter generates Go struct and Rust enum. No manual translation.

### 4.2 The Strangler Pattern (JVM → Rust)
**Scenario:** Migrate session manager from Java to Rust sidecar.  
**Win:** Parity testing. Sprefa's `tsp_deps` shows which Java files reference the old API. Run both, compare outputs using monomorphized types, flip when depth = 0 for Java deps.

### 4.3 The Stateful Daemon (WebSocket Coroutine)
**Scenario:** Real-time collaborative canvas with stateful Rust backend.  
**Win:** State machine declared in TSP. Emitter generates Rust `match` and TS `switch`. Add "erase" event = both sides get new case, compiler enforces handling.

### 4.4 The Multi-Target Dispatcher (Orchestrator → Lambda + Agent + Legacy)
**Scenario:** One command triggers Node Lambda, Rust agent, and Java legacy.  
**Win:** TSP defines `Command` discriminated union. Emitter generates dispatchers for all three targets. Same `command_id` type everywhere.

### 4.5 The Plugin Architecture (Rust Core → Python/JS/Lua)
**Win:** TSP defines `PluginAPI`. Emitter generates FFI boilerplate for host and typed SDKs for plugins. Add capability = all plugins get new method stub.

### 4.6 Cross-Process Memory (Shared WASM)
**Scenario:** Rust backend streams geometry data to TS frontend via WASM shared memory.  
**Win:** TSP defines memory layout with `@offset`. Emitter generates packed structs and DataViews. Sprefa extracts layout from `.wasm` binary, flags mismatches static.

### 4.7 The Feature Flag Router
**Scenario:** Route to `NewBillingEngine` or `OldBillingEngine` based on flag.  
**Win:** TSP defines `BillingEngine` union. Emitter generates router that reads flag at runtime. Type-safe fallback.

### 4.8 The Error Domain Bridge
**Scenario:** Rust `FileNotFound` → Go `os.PathError`.  
**Win:** TSP `FileOperationError` enum. Emitter generates `From` impls and `errors.As` hooks. Same variant names in both languages.

### 4.9 The Metrics Injection
**Scenario:** Every operation needs `duration_ms`, `user_id` logged.  
**Win:** TSP `Telemetry` resolved param. Emitter generates extractor that auto-instruments every handler. Metric names are monomorphized.

### 4.10 The Frontend State Sync (Mirror)
**Scenario:** TS UI mirrors backend state machine for optimistic updates.  
**Win:** TSP defines `State` and `Transitions`. Emitter generates Redux reducer and Rust service. Add "PendingApproval" state = both sides update.

## 5. Advanced: WASM Shared Memory Protocol

### 5.1 TSP Memory Layout Definition

```tsp
@wasm_linear_memory(export = "geometry_cache", id = 0)
model GeometryData {
  @offset(0) vertex_count: uint32;
  @offset(4) vertices: float32[];
  // Next offset calculated: 4 + vertex_count * 4
  @offset(auto) triangle_count: uint32;
  @offset(auto) triangles: int32[];
}
```

### 5.2 Emitter Output

**Rust (WASM):**
```rust
#[link_section = "geometry_cache"]
static mut GEOMETRY_CACHE: [u8; 4096] = [0; 4096];

#[no_mangle]
pub fn get_vertex_ptr() -> *const f32 {
    unsafe { GEOMETRY_CACHE.as_ptr().add(4) as *const f32 }
}
```

**TypeScript (Host):**
```typescript
const memory = wasmModule.exports.memory as WebAssembly.Memory;
const buffer = new DataView(memory.buffer);
const vertexCount = buffer.getUint32(0, true);
const vertices = new Float32Array(memory.buffer, 4, vertexCount);
```

### 5.3 Sprefa's Role

In `crates/extract/src/wasm.rs`:
```rust
pub fn extract_wasm_layout(path: &Path) -> WasmMemorySegment {
    let module = wasmparser::ModuleReader::new(fs::read(path)?)?;
    for export in module.exports() {
        if export.name == "geometry_cache" {
            return WasmMemorySegment {
                export_name: export.name,
                memory_id: export.index,
                min_size: module.memories().next()?.limits.min,
                tsp_refkey: extract_tsp_refkey_from_wasm_custom_section(module)?,
            };
        }
    }
}
```

Sprefa stores this in `wasm_memory_segments` table. When TSP changes, emitter produces new offsets; `sprefa check` compares old vs new layout, flags breaking changes static.

## 6. User Customization & Route Configs

### 6.1 Route Configuration as Typed Models

```tsp
model RouteConfig {
  auth: "required" | "optional" | "none";
  rateLimit: integer;
  featureFlag?: string;
  // User-provided extensions
  metadata: Record<string>;
}

model Route<T, TConfig extends RouteConfig> {
  component: T;
  config: TConfig;
}

// Usage
"/users": Route<Component<UserState>, {
  auth: "required",
  rateLimit: 100,
  featureFlag: "new-user-model",
  metadata: { team: "platform" }
}>;
```

Emitter translates `config` to:
- **Rust (Axum):** `#[rate_limit(100)]` attribute + middleware registration
- **TypeScript (TanStack):** `loader` function that checks feature flag

### 6.2 Userdata (Cross-Boundary Metadata)

```tsp
// In src/api/users/user_id_.tsp
@userdata(analytics = "user.view", permissions = ["user:read"])
op get_user(@path user_id: string): User;
```

Sprefa extractor captures `@userdata` as a `tsp_symbols.template_args` JSON blob. Emitter generates:
- **Rust:** `#[allow(analytics = "user.view")]`
- **TS:** `get_user.userdata = { analytics: "user.view" }`

Both sides share the same metadata schema, enabling unified observability.

## 7. The Live Refactoring Dream (Static Version)

### 7.1 Symbol-Level Collaboration

**Setup:**
- Each dev runs `sprefa daemon` locally
- Daemon connects to central `sprefa-colab` server (optional)
- Server broadcasts **symbol-level deltas**, not file-level

### 7.2 The "Visual Overlay" (Terminal UI)

```bash
$ sprefa status --watch

Symbols being edited:
  src/api/users/user_id_.customer_id
    ├─ chrishafley (typing, col: 12)
    ├─ alice (viewing emitted file)
    └─ bob (blocked: hardcoded "user_id" in src/manual/auth.rs:42)

Emitted files pending:
  src/routes/user_id_/index_auto.rs [~]
  out/react/user_detail.tsx [~]

Blast radius depth: 3
  Depth 1: 2 auto files
  Depth 2: 1 manual file (needs import rewrite)
  Depth 3: 1 manual file (conflict)
```

`[~]` = flashing, indicates emitter will write soon.

### 7.3 The "Atomic Rename" Transaction (Static)

Since it's all static, the "transaction" is just a **preview**:

```bash
$ sprefa rename --from user_id --to customer_id --dry-run

✓ TSP symbol updated: src.api.users.user_id_.customer_id
✓ 2 _auto files regenerated
✓ 1 manual file import rewritten
✗ Conflict: src/manual/auth.rs contains hardcoded string "user_id"
  Suggestion: Add // sprefa-ignore user_id

Rename aborted. Fix conflicts and retry.
```

**No runtime coordination needed**—it's all static analysis.

## 8. Implementation Roadmap

### Phase 1: TSP Symbol Extraction
- Build `crates/extract/src/tsp.rs`
- Patch TSP compiler to emit `--dump-symbols` JSON
- Populate `tsp_symbols` and `tsp_deps` tables

### Phase 2: Incremental Builds
- Modify `sprefa watch` to call TSP compiler on `.tsp` changes
- Generate `SymbolDelta` from diffing old vs new `tsp_symbols`
- Rebuild only stale emitted files

### Phase 3: Blast Radius UI
- Add `sprefa blast-radius` command
- Build terminal UI showing symbol tree
- Integrate with `sprefa lsp` for editor overlays

### Phase 4: Reflexive Renames
- Detect renames in manual files via span proximity
- Auto-edit TSP source
- Complete the loop

### Phase 5: WASM Memory Layout
- Add `wasm` extractor
- Extend emitter for `@wasm_linear_memory`
- Add layout compatibility checks

---

## Appendix A: Turn-by-Turn Attribution

| Turn | Time | Model | Key Contributions |
|------|------|-------|-------------------|
| 1 | 2025-04-04 00:00 | Gemini 4 | Initial concept of stateful coroutine monomorphization, resolved params |
| 2 | 2025-04-04 00:03 | Kimi 2.5 | Practical scenarios (language bridge, strangler pattern, stateful daemon) |
| 3 | 2025-04-04 00:05 | Gemini 4 | Brainblast: TSP + sprefa integration for dependency tracking |
| 4 | 2025-04-04 00:07 | Kimi 2.5 | Static analysis focus, schema extensions, incremental builds |
| 5 | 2025-04-04 00:10 | Gemini 4 | Live refactoring dream, multiplayer editing, symbol diffing |
| 6 | 2025-04-04 00:12 | Kimi 2.5 | Sprefa architecture review, watcher integration plan |
| 7 | 2025-04-04 00:15 | Gemini 4 | Process/runtime fantasy (rejected) → static core refocus |
| 8 | 2025-04-04 00:18 | Kimi 2.5 | Complete static implementation: blast radius SQL, WASM extraction |
| 9 | 2025-04-04 00:20 | Gemini 4 | Documentation synthesis, roadmap, attribution request |

**Total Tokens:** ~8,500 across 9 turns  
**Models:** Gemini 4 (5 turns), Kimi 2.5 (4 turns)
