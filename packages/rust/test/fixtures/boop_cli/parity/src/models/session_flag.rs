use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SessionFlag {
  #[arg(long)]
  pub session: Option<String>,
}
