use serde::Deserialize;
use serde::Serialize;

#[derive(Debug, Clone, Serialize, Deserialize, clap::Args, Default)]
pub struct ModeFlag {
  #[arg(long)]
  pub mode: Option<String>,
}
