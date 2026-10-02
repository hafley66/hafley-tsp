use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct MergedIntoFlag {
  #[doc = "Check merge against this branch instead of the lane's base branch or `main`; a merged branch's worktree and branch are removed, an unmerged one is kept"]
  #[arg(long = "merged-into", value_name = "BRANCH")]
  pub branch: Option<String>,
}
