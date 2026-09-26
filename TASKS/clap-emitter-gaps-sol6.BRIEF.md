# clap emitter: close the gaps (lane C2)

Repo hafley-tsp. Base: e0f63fb (branch feat/clap-emitter). Files: packages/rust/**, packages/decorator-def/**.
Never touch the main checkout (someone's WIP is in packages/rust/src/emitter/03_emit-crate.tsx).

## Context
packages/rust (@hafley66/alloy-rs) emits from TypeSpec @typespec/http ops:
- ops_auto.rs + an ops.rs stub (in-process, never overwritten);
- cli_auto.rs (clap 4 derive, run() dispatch, JSONL streams via JsonlStream<T>);
- http_auto.rs (an axum Router).
Domain types come from tsp-rust emitModel by refkey and are never copied.
Key files: src/adapters/02_http-ops.ts, src/emitter/04_ops-plan.ts, src/components/4_codegen/7_OpsTransports.tsx,
test/fixtures/ryi_cli/{domain,ops}.tsp and its parity/ crate (tests/parity.rs: one assert_eq over 91 rows,
generated clap vs ryi's handwritten CLI). Gate: `CARGO_CHECK=1 npx vitest run` in packages/rust (161 pass).
Read ~/projects/claude-research/skills/typespec/SKILL.md and its custom-emitter and Alloy-language references first.

## Gaps to close
- clap: value_name, requires, conflicts_with, ArgGroup required-one-of, value_delimiter, range value parsers,
  long-name override (field `patterns` -> `--pattern`), root-level args + args_conflicts_with_subcommands,
  a positional nested in a flattened model (ryi's `Inputs`).
- @header extraction; optional @path without openapi3's invalid-style warnings; `@` in doc comments.
- Prefer std TypeSpec decorators (@minValue/@maxValue, @encodedName, @doc). Add hafley decorators only in
  packages/decorator-def, only where no std spelling exists.
- Extend the parity fixture to ryi's full CLI: `git -C ~/projects/hafley-rs show main:crates/sprefa-extract/src/bin/ryi/0_cli.rs`
  (the root FileArgs, every subcommand, the after_help texts), until 0 differences.

## Rules (reviewed before merge)
- The parity table's expected side is rendered from the handwritten CLI. Never hand-edit it, never drop rows,
  and never exclude a flag without listing it as a named gap. No skipped or loosened tests.
- Commit at every green step. Trailer: `Co-Authored-By: GPT-6 Sol (codex) <noreply@openai.com>`.
- Report (under 40 lines): tip sha, gaps closed (decorator: std or new), parity rows / diffs, test counts,
  remaining gaps, the exact gate command + its last 5 lines.
