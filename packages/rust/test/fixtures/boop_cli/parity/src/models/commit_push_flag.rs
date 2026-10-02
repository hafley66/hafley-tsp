use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct CommitPushFlag {
  #[doc = "How the lane's commits reach its parent: `door` or `mailbox`. Absent, the parent's kind picks the default"]
  #[arg(long = "commit-push")]
  pub mode: Option<String>,
}
