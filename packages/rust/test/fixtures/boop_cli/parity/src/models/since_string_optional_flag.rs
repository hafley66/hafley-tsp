use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SinceStringOptionalFlag {
  #[arg(long)]
  pub since: Option<String>,
}
