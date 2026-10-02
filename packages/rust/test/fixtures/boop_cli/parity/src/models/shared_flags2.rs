use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct SharedFlags2 {
  #[doc = "Include unregistered tmux sessions and native Claude subagents"]
  #[arg(long)]
  pub all: bool,
}
