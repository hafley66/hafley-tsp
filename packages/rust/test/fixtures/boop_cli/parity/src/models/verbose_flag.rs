use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct VerboseFlag {
  #[doc = "Include recipients skipped by liveness proof"]
  #[arg(long)]
  pub verbose: bool,
}
