import "../../../packages/binding-core/lib/main.tsp";
import "./settings.tsp";

using Cli;

@Cli.command
@Cli.subcommand(AppSettings)
@Cli.about("Run sync loop")
model SyncCmd {
  @Cli.cliFlag
  @Cli.about("Run once and exit")
  once: boolean | null;

  @Cli.cliFlag
  @Cli.about("Sync only PRs")
  prs_only: boolean | null;
}

@Cli.command
@Cli.subcommand(AppSettings)
@Cli.about("Query cached data")
model QueryCmd {
  @Cli.cliArg(0)
  @Cli.about("Entity to query: prs, repos, branches, notifications")
  entity: string;

  @Cli.cliFlag
  @Cli.short("r")
  @Cli.about("Filter by repo slug (owner/name)")
  repo: string | null;

  @Cli.cliFlag
  @Cli.short("n")
  @Cli.about("Max results")
  limit: integer | null;

  @Cli.cliFlag
  @Cli.about("Output format: table, json, csv")
  format: string | null;
}
