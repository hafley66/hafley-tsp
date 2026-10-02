use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct PathFlag {
  #[arg(long)]
  pub path: Option<String>,
}
