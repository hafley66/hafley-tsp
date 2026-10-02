use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags34 {
  #[doc = "Print the worktree, branch, base sha and the literal `cmd:` line without spawning"]
  #[arg(long)]
  pub dry_run: bool,
}
