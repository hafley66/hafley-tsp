use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags51 {
  #[arg(long)]
  pub goal: Option<String>,
}
