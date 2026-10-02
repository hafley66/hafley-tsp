use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags61 {
  #[arg(long)]
  pub socket: Option<String>,
}
