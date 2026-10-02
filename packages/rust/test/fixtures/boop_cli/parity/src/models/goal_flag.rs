use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct GoalFlag {
  #[doc = "What the lane is running toward"]
  #[arg(long)]
  pub goal: Option<String>,
}
