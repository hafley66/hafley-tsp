use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags49 {
  #[arg(long)]
  pub mode: Option<String>,
}
