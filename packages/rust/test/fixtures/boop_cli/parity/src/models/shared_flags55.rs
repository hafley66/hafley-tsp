use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags55 {
  #[doc = "Check merge against this branch instead of the lane's base branch or `main`; a merged branch's worktree and branch are removed, an unmerged one is kept"]
  #[arg(long)]
  pub branch: Option<String>,
}
