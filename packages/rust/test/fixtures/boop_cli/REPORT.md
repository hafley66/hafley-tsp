# Boop clap type derivation

Base: `main` at `5381dcc`. Final help parity: **155/155**. No help capture changed.

| Extension kind | Before | After |
| --- | ---: | ---: |
| `x-clap-value-name` | 6 | 0 |
| `x-clap-last` | 1 | 0 |
| `x-clap-short` | 3 | 3 |
| `x-clap-hidden` | 11 | 11 |
| `x-clap-after-help` | 1 | 1 |
| `x-clap-args-conflicts-with-subcommands` | 4 | 4 |
| `x-clap-subcommand-required` | 2 | 2 |
| **Declarations** | **28** | **21** |
| **Distinct kinds** | **7** | **5** |

The base contains two kinds targeted for removal, `value-name` and `last`. The five explicitly retained kinds account for all remaining declarations. The task title's count of four removable kinds does not match this base.

## Step 1: labels and records

All six value-name extensions are replaced by native types. Named scalar labels use the final PascalCase component after removing a trailing `Name`: `MessageId` → `ID`, `LaneName` → `LANE`, `GitBranch` → `BRANCH`. Primitive fields retain clap's field-derived labels; existing `Clap.*` metadata remains supported.

| Captured label | Type |
| --- | --- |
| `ID-OR-JOB` | `MessageId \| Job` |
| `ID-OR-LANE` | `MessageId \| LaneName` |
| `MS\|DURATION` | `int64 \| duration` |
| `LANE` | `LaneName` |
| `BRANCH` | `GitBranch` |
| `KEY=VAL` | `Record<string>` |

Union member labels join with `-OR-`. The ordered `int64 | duration` pair derives `MS|DURATION`, preserving the epoch-millisecond/duration capture. Union values retain the adapter's existing string representation.

String records emit repeatable arguments with a generated `KEY=VAL` parser. The clap field stores `Vec<(String, String)>`, retaining order and duplicate keys. Parsing splits the first `=`, accepts empty values, and rejects absent `=` or empty keys. HTTP query maps are collected into that argument representation. Models without clap derives retain `HashMap` fields.

Step 1 parity: **155/155**.

## Step 2: trailing arguments

`tui` declares `@body args?: string[]`. The adapter derives positional placement and `last = true` from a body string array. Its route includes only the `harness` path parameter. The parser accepts omitted arguments and forwards flags after `--`; values before the separator are rejected.

Step 2 parity: **155/155**.

## Step 3: importer and source naming

Shared flag models use flag names, such as `MailDirFlag`. Repeated wire names with different declarations add qualifiers from documentation or type, requiredness, and defaults. Name collisions fail the importer rather than adding ordinal suffixes.

Path parameters use their field names with bare `@path`. Operation names use the local route segment, such as `mail` inside `db`; repeated local names receive route context in flat Rust symbols. The fixture's existing implementation stubs were migrated to the corresponding symbols. Obsolete generated `shared_flags*.rs` files were removed.

`debug` has a positional lane and a `--lane` flag. Their source fields are `lane_arg: LaneName` and `lane: LaneName`, preventing an HTTP path/query name collision. Both labels remain `LANE` in help.

Step 3 parity: **155/155**.

## Validation

- `CARGO_BUILD_JOBS=4 node packages/rust/test/fixtures/boop_cli/2_check_help.mjs`: **155/155**.
- `pnpm -C packages/rust test`: **163 passed, 4 skipped**, including byte-identical ryi regeneration.
- `pnpm -C packages/rust exec tsc --noEmit -p tsconfig.build.json`: passed.
- Generated Rust parser tests cover repeated and malformed record entries and trailing separator behavior.
- Importer regeneration produces identical `ops.tsp` bytes.

The help gate executes the generated parser and compares stdout bytes and exit status against the boop2 captures. Results are stored under `parity/help-results/`. `BOOP_HELP_FIXTURES` can override the default capture directory, `/Users/chrishafley/projects/boop2/fixtures/help`.
