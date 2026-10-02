use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags15 {
  #[doc = "A worktree-relative path that must exist for the lane to count as complete. Repeatable"]
  #[arg(long)]
  pub expect_path: Option<Vec<String>>,
}
