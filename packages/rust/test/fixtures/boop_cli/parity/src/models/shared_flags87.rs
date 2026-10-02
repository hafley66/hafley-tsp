use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags87 {
  #[doc = "The forked lane, when one comment forked off several"]
  #[arg(long)]
  pub lane: Option<String>,
}
