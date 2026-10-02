use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags10 {
  #[doc = "The format the lane's mail is rendered in; it inherits the parent's when absent"]
  #[arg(long)]
  pub mood: Option<String>,
}
