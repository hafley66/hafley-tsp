use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct StateBulkDeleteDeadRemovesFlag {
  #[doc = "Bulk delete: `dead` removes every dead lane's route and its own worktree, and nothing above it. Pair with `--dry-run` first"]
  #[arg(long)]
  pub state: Option<String>,
}
