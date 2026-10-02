use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags8 {
  #[doc = "Absolute path to the brief the lane reads and executes"]
  #[arg(long)]
  pub brief: Option<String>,
}
