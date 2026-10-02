use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags9 {
  #[doc = "What the lane is running toward"]
  #[arg(long)]
  pub goal: Option<String>,
}
