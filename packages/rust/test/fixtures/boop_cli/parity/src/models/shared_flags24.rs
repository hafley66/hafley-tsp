use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags24 {
  #[doc = "Defaults to the caller, then to the one registered coordinator"]
  #[arg(long)]
  pub parent: Option<String>,
}
