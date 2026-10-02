use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags39 {
  #[doc = "Skip the prompt and revive every row"]
  #[arg(long)]
  pub yes: bool,
}
