use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags60 {
  #[arg(long)]
  pub lines: Option<String>,
}
