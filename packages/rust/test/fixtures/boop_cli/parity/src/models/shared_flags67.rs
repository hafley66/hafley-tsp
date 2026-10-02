use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags67 {
  #[doc = "Continue an existing harness conversation instead of opening one"]
  #[arg(long)]
  pub resume: Option<String>,
}
