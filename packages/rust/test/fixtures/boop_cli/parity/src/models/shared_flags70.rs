use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags70 {
  #[doc = "Validation command carried from `lane create`"]
  #[arg(long)]
  pub verify: Option<String>,
}
