use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct TmuxFlag {
  #[doc = "Overrides the tmux session name derived from `--branch`"]
  #[arg(long)]
  pub tmux: Option<String>,
}
