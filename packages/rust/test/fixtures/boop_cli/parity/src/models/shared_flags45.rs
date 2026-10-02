use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags45 {
  #[arg(long)]
  pub harness: Option<String>,
}
