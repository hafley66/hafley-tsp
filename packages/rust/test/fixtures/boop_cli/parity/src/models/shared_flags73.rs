use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags73 {
  #[arg(long)]
  pub limit: Option<String>,
}
