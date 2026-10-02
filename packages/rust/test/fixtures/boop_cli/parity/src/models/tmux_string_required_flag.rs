use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct TmuxStringRequiredFlag {
  #[arg(long)]
  pub tmux: String,
}
