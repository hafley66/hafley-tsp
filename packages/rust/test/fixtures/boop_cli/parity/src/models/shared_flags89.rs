use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags89 {
  #[doc = "Include recipients skipped by liveness proof"]
  #[arg(long)]
  pub verbose: bool,
}
