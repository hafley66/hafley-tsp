use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags3 {
  #[doc = "One JSON object per row; includes the full route fields"]
  #[arg(long)]
  pub json: bool,
}
