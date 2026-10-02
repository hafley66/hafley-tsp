use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags16 {
  #[doc = "An exact commit subject line that must appear in a commit after base_sha for the lane to count as complete. Repeatable"]
  #[arg(long)]
  pub expect_commit_subject: Option<Vec<String>>,
}
