use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct ExpectCommitsAtLeastFlag {
  #[doc = "A lower bound on the commits after base_sha for the lane to count as complete"]
  #[arg(long)]
  pub expect_commits_at_least: Option<String>,
}
