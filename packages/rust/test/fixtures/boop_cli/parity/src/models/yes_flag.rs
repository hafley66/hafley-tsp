use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct YesFlag {
  #[doc = "Skip the prompt and revive every row"]
  #[arg(long, short = 'y')]
  pub yes: bool,
}
