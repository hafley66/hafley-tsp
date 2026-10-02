use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags86 {
  #[doc = "The subscriber; defaults to the caller's identity"]
  #[arg(long)]
  pub name: Option<String>,
}
