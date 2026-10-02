use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags12 {
  #[doc = "Skip the repo's `boop-start` warmup in the new worktree"]
  #[arg(long)]
  pub no_start: bool,
}
