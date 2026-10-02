use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags20 {
  #[doc = "How the lane's commits reach its parent: `door` or `mailbox`. Absent, the parent's kind picks the default"]
  #[arg(long)]
  pub mode: Option<String>,
}
