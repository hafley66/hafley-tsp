use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct VerifyFlag {
  #[doc = "Run this command in the lane worktree before writing its result row"]
  #[arg(long = "verify")]
  pub command: Option<String>,
}
