use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct LimitFlag {
  #[arg(long)]
  pub limit: Option<String>,
}
