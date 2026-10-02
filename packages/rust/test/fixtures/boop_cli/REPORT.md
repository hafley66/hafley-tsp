# Boop clap parity

Baseline after route-tree emission: **91/155** byte-identical help captures.
The baseline uses zero `Clap.*` imports or decorators.

The gate builds the parity crate and executes its generated parser as `boop <path> --help`. It compares stdout bytes with the read-only boop2 captures, checks exit status, and retains diffs and stderr in `parity/help-results/`.

```sh
BOOP_EMIT=1 pnpm -C packages/rust exec vitest run src/emitter/08_boop-cli.test.tsx
CARGO_BUILD_JOBS=4 node packages/rust/test/fixtures/boop_cli/2_check_help.mjs
```

The fixture directory defaults to `/Users/chrishafley/projects/boop2/fixtures/help`; override it with `BOOP_HELP_FIXTURES`. The gate supports `BOOP_PARITY_BIN`, `BOOP_PARITY_OUTPUT`, and `--no-build`.

| Concept | Fixtures needing it (count + names) | Native form used or decorator added | Why native failed |
| --- | --- | --- | --- |
| Command nesting | 155: tree.json inventory | HTTP namespaces and `@route`; trie drops parameter segments | Existing emitter flattened operation names |
| Positional and flag classification | 155: tree.json inventory | `@path`, `@query`, model spreads | Shared model bool fields required clap switch types |
| Help paragraphs and enum choices | Fixtures with captured help or possible values | Doc comments, enums, native defaults | Enum member docs still need emitter support |
| Different wire flag and field label | See retained diffs | Explicit `@query(name)` | Emitter does not yet read query wire names |
| Required repeated positionals | tag add, tag for | Native `@minItems(1)` planned | Rust Vec alone permits zero items |
| Short flags | job revive, beep lane revive, tag recent, tag search | Pending native-form evaluation | HTTP placement does not carry a short option |
| Hidden commands | boop, job, beep lane | Pending native-form evaluation | Property visibility cannot target an operation |
| Group own-form and child-form usage | Group captures in retained diffs | Pending native-form evaluation | Required children and local args need separate clap settings |
| Trailing args | tui | Pending native-form evaluation | An HTTP path array does not specify `--` placement |
| Nonstandard metavariables | beep agent waterfall, job create, beep lane create, debug, mail wait, wait | Pending native-form evaluation | Some captures use punctuation or duplicate labels |
| Root and group extra help | boop, beep | Pending native-form evaluation | Doc extraction currently supplies the leading paragraph only |

Aliases, conflicts, requires, hyphen values, and custom parsers affect acceptance. Help captures alone cannot establish every parser behavior. The prior attempt's gap table and repros are read-only evidence for the acceptance audit.

Native metadata pass: **135/155**. Query wire names, enum-member docs, required arrays (`@minItems(1)`), complete operation docs, and groups with zero args account for 44 additional matching captures. No custom decorator was added.

Short flags: `@extension("x-clap-short", "y" | "n")` on native query fields. Required by 4 captures: job revive, beep lane revive, tag recent, tag search. HTTP parameter names have no independent one-character flag slot; OpenAPI extensions retain the metadata without a custom decorator.

Hidden commands: `@extension("x-clap-hidden", true)` on operations omitted from their parent's visible command roster. This addresses the boop, job, and beep lane parent captures. `@visibility` accepts model properties, so it cannot mark an operation hidden. No custom decorator was added.

Group args versus child commands: `@extension("x-clap-args-conflicts-with-subcommands", true)` on 4 operations: beep, beep fork, db, db usage. The captures contain two usage forms with args omitted from the child-command form. HTTP routes locate fields but have no rule forbidding their use with a child command.

Required child commands: `@extension("x-clap-subcommand-required", true)` on 2 operations: me, beep selection. Both have local flags and require `<COMMAND>`. HTTP parameter optionality describes the flags, not the presence of a nested CLI command.
