use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags74 {
  #[arg(long)]
  pub session: Option<String>,
}
