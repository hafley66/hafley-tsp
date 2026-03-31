import "../../../packages/binding-core/lib/main.tsp";

using Config;
using Cli;
using Entity;

/** Application settings -- surfaces as both config file and CLI flags. */
@Config.source
@Config.path("~/.config/ghcacher/config.toml")
@Cli.command
@Cli.about("GitHub organization cacher")
model AppSettings {
  @Config.envVar("GITHUB_TOKEN")
  @Config.secret
  @Cli.cliFlag
  @Cli.about("GitHub personal access token")
  github_token: string;

  @Config.envVar("GHCACHER_ORG")
  @Cli.cliFlag
  @Cli.short("o")
  @Cli.about("GitHub organization to cache")
  org: string;

  @Config.envVar("GHCACHER_DB")
  @Entity.default("ghcacher.db")
  @Cli.cliFlag
  @Cli.about("SQLite database path")
  db_path: string;

  @Entity.default("60")
  @Cli.cliFlag
  @Cli.short("i")
  @Cli.about("Poll interval in seconds")
  poll_interval: integer;

  @Entity.default("true")
  @Cli.cliFlag
  @Cli.about("Enable notification sync")
  sync_notifications: boolean;

  @Entity.default("5")
  @Cli.cliFlag
  @Cli.about("Max concurrent API requests")
  max_concurrency: integer;
}
